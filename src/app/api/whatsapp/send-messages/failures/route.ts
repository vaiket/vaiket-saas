import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type FailureEntry = {
  id: string;
  createdAt: string;
  templateKey: string;
  templateLanguage: string | null;
  failed: number;
  reason: string;
};

function parseFailureEntries(rows: Array<{ id: bigint; createdAt: Date; meta: unknown }>) {
  const failures: FailureEntry[] = [];

  for (const row of rows) {
    const meta = (row.meta as Record<string, unknown> | null) || {};
    const failed = Number(meta.failed ?? 0);
    const firstError = String(meta.firstError ?? "").trim();

    if (!failed && !firstError) continue;

    failures.push({
      id: row.id.toString(),
      createdAt: row.createdAt.toISOString(),
      templateKey: String(meta.templateKey ?? "").trim() || "-",
      templateLanguage: String(meta.templateLanguage ?? "").trim() || null,
      failed: Number.isFinite(failed) ? failed : 0,
      reason: firstError || "Unknown failure",
    });
  }

  return failures;
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

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: auth.tenantId,
        action: "tenant.whatsapp.send_messages.dispatch",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        meta: true,
      },
    });

    const failures = parseFailureEntries(logs).slice(0, 10);

    return NextResponse.json({
      success: true,
      failures,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch failures",
      },
      { status: 500 }
    );
  }
}
