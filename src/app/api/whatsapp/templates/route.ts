import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type MetaTemplate = {
  name: string;
  language: string;
  status: string;
  category: string | null;
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function parseLanguage(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || "en_US";
  }

  if (value && typeof value === "object") {
    const code = readText((value as Record<string, unknown>).code);
    return code || "en_US";
  }

  return "en_US";
}

function parseMetaTemplates(payload: unknown) {
  const rows = Array.isArray((payload as Record<string, unknown> | null)?.data)
    ? ((payload as Record<string, unknown>).data as Record<string, unknown>[])
    : [];

  const dedupe = new Map<string, MetaTemplate>();
  for (const row of rows) {
    const name = readText(row.name);
    if (!name) continue;

    const language = parseLanguage(row.language);
    const status = readText(row.status).toUpperCase() || "UNKNOWN";
    const category = readText(row.category).toUpperCase() || null;
    const key = `${name}::${language}`;

    dedupe.set(key, {
      name,
      language,
      status,
      category,
    });
  }

  return Array.from(dedupe.values()).sort((a, b) => {
    if (a.name === b.name) return a.language.localeCompare(b.language);
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRoleAtLeast(auth.role, "member")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
    if (subscriptionBlocked) return subscriptionBlocked;

    const url = new URL(req.url);
    const accountId = readText(url.searchParams.get("accountId"));
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "accountId is required" },
        { status: 400 }
      );
    }

    const account = await prisma.waAccount.findFirst({
      where: {
        id: accountId,
        tenantId: auth.tenantId,
      },
      select: {
        wabaId: true,
        accessToken: true,
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    if (!account.wabaId || !account.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Account is missing wabaId or accessToken",
        },
        { status: 400 }
      );
    }

    const apiVersion = readText(process.env.WHATSAPP_GRAPH_API_VERSION) || "v25.0";
    const endpoint = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(
      account.wabaId
    )}/message_templates?fields=name,status,category,language&limit=250`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      cache: "no-store",
    });

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const payloadObj = (payload as Record<string, unknown> | null) || {};
      const errorObj =
        payloadObj.error && typeof payloadObj.error === "object"
          ? (payloadObj.error as Record<string, unknown>)
          : null;
      const errorMessage =
        readText(errorObj?.message) ||
        readText(payloadObj.message) ||
        `Meta API error (${res.status})`;

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 502 }
      );
    }

    const templates = parseMetaTemplates(payload);
    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch templates",
      },
      { status: 500 }
    );
  }
}
