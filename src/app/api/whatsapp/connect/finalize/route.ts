import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type FinalizeBody = {
  candidateKey?: unknown;
  accountLabel?: unknown;
  webhookVerifyToken?: unknown;
  saveFetchedToken?: unknown;
};

type ConnectCandidate = {
  key: string;
  source: "owned" | "client";
  businessId: string;
  businessName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  phoneNumber: string;
  verifiedName: string | null;
  qualityRating: string | null;
  verificationStatus: string | null;
  nameStatus: string | null;
};

type ConnectContextPayload = {
  tenantId: number;
  userId: number;
  connectedAt: number;
  expiresAt: number;
  metaUserId: string | null;
  metaUserName: string | null;
  accessToken: string;
  candidates: ConnectCandidate[];
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function readOptional(value: unknown) {
  const text = readText(value);
  return text || null;
}

function decodeContext(raw: string): ConnectContextPayload | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as ConnectContextPayload;
    if (!parsed?.tenantId || !parsed?.userId || !parsed?.expiresAt || !Array.isArray(parsed.candidates)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  return `+${cleaned}`;
}

function toStatusLabel(params: { accessToken: string | null; webhookVerifyToken: string | null }) {
  if (params.accessToken && params.webhookVerifyToken) return "connected";
  if (params.accessToken) return "pending_webhook";
  return "pending_token";
}

function isValidWebhookToken(value: string) {
  return /^[a-zA-Z0-9._\-]{8,128}$/.test(value);
}

function clearCtxCookie(response: NextResponse, secure: boolean) {
  response.cookies.set("wa_connect_ctx", "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRoleAtLeast(auth.role, "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
    if (subscriptionBlocked) return subscriptionBlocked;

    let body: FinalizeBody;
    try {
      body = (await req.json()) as FinalizeBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const candidateKey = readText(body.candidateKey);
    if (!candidateKey) {
      return NextResponse.json({ success: false, error: "candidateKey is required" }, { status: 400 });
    }

    const labelInput = readOptional(body.accountLabel);
    const webhookInput = readOptional(body.webhookVerifyToken);
    const saveFetchedToken = Boolean(body.saveFetchedToken ?? true);

    if (webhookInput && !isValidWebhookToken(webhookInput)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook verify token must be 8-128 chars and use letters, numbers, dot, underscore or dash",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const rawContext = readText(cookieStore.get("wa_connect_ctx")?.value);
    if (!rawContext) {
      return NextResponse.json(
        { success: false, error: "No active auto-connect context. Start Facebook connect again." },
        { status: 400 }
      );
    }

    const context = decodeContext(rawContext);
    const secure = new URL(req.url).protocol === "https:";
    if (!context) {
      const response = NextResponse.json(
        { success: false, error: "Invalid auto-connect context" },
        { status: 400 }
      );
      clearCtxCookie(response, secure);
      return response;
    }

    if (context.expiresAt <= Date.now()) {
      const response = NextResponse.json(
        { success: false, error: "Auto-connect session expired. Start again." },
        { status: 400 }
      );
      clearCtxCookie(response, secure);
      return response;
    }

    if (context.tenantId !== auth.tenantId || context.userId !== auth.userId) {
      const response = NextResponse.json(
        { success: false, error: "Auto-connect session mismatch" },
        { status: 403 }
      );
      clearCtxCookie(response, secure);
      return response;
    }

    const candidate = context.candidates.find((item) => item.key === candidateKey) || null;
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    const phoneNumber = normalizePhone(candidate.phoneNumber);
    const phoneNumberId = readText(candidate.phoneNumberId);
    const wabaId = readText(candidate.wabaId);
    const businessId = readOptional(candidate.businessId);
    const accountName =
      labelInput ||
      readOptional(candidate.verifiedName) ||
      readOptional(candidate.wabaName) ||
      readOptional(candidate.businessName) ||
      "WhatsApp Account";

    const existingByPhone = await prisma.waAccount.findFirst({
      where: {
        tenantId: auth.tenantId,
        phoneNumber,
      },
      select: {
        id: true,
        accessToken: true,
        webhookVerifyToken: true,
      },
    });

    const existingByPhoneId = await prisma.waAccount.findFirst({
      where: {
        tenantId: auth.tenantId,
        phoneNumberId,
      },
      select: {
        id: true,
        accessToken: true,
        webhookVerifyToken: true,
      },
    });

    if (existingByPhone && existingByPhoneId && existingByPhone.id !== existingByPhoneId.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Found conflicting account mapping for phone and phone ID. Please resolve manually from account list.",
        },
        { status: 409 }
      );
    }

    const target = existingByPhone || existingByPhoneId || null;
    const resolvedWebhookToken = webhookInput || target?.webhookVerifyToken || null;
    const resolvedAccessToken = saveFetchedToken
      ? context.accessToken
      : target?.accessToken || null;

    const status = toStatusLabel({
      accessToken: resolvedAccessToken,
      webhookVerifyToken: resolvedWebhookToken,
    });

    const account = target
      ? await prisma.waAccount.update({
          where: { id: target.id },
          data: {
            name: accountName,
            phoneNumber,
            phoneNumberId,
            wabaId,
            businessId,
            ...(saveFetchedToken ? { accessToken: context.accessToken } : {}),
            webhookVerifyToken: resolvedWebhookToken,
            qualityRating: readOptional(candidate.qualityRating),
            status,
            lastSyncAt: null,
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            phoneNumberId: true,
            wabaId: true,
            businessId: true,
            status: true,
            qualityRating: true,
            createdAt: true,
          },
        })
      : await prisma.waAccount.create({
          data: {
            tenantId: auth.tenantId,
            name: accountName,
            phoneNumber,
            phoneNumberId,
            wabaId,
            businessId,
            accessToken: saveFetchedToken ? context.accessToken : null,
            webhookVerifyToken: resolvedWebhookToken,
            qualityRating: readOptional(candidate.qualityRating),
            status,
            createdByUserId: auth.userId,
          },
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            phoneNumberId: true,
            wabaId: true,
            businessId: true,
            status: true,
            qualityRating: true,
            createdAt: true,
          },
        });

    await writeAuditLog({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: target
        ? "tenant.whatsapp.account.autoconnect.update"
        : "tenant.whatsapp.account.autoconnect.create",
      entity: "WaAccount",
      entityId: account.id,
      meta: {
        candidateKey,
        source: candidate.source,
        wabaId: account.wabaId,
        phoneNumber: account.phoneNumber,
        savedFetchedToken: saveFetchedToken,
      },
      req,
    });

    const response = NextResponse.json({
      success: true,
      mode: target ? "updated" : "created",
      account,
    });
    clearCtxCookie(response, secure);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to finalize auto-connect",
      },
      { status: 500 }
    );
  }
}
