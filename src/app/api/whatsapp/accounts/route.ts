import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type CreateAccountBody = {
  accountId?: unknown;
  name?: unknown;
  phoneNumber?: unknown;
  phoneNumberId?: unknown;
  wabaId?: unknown;
  businessId?: unknown;
  accessToken?: unknown;
  webhookVerifyToken?: unknown;
};

function readRequired(value: unknown) {
  return String(value ?? "").trim();
}

function readOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function getAppBaseUrl(req: Request) {
  const envBase = readRequired(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  if (envBase) return envBase.replace(/\/+$/g, "");

  const requestUrl = new URL(req.url);
  const forwardedProto = readRequired(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readRequired(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readRequired(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function toStatusLabel(params: { accessToken: string | null; webhookVerifyToken: string | null }) {
  if (params.accessToken && params.webhookVerifyToken) return "connected";
  if (params.accessToken) return "pending_webhook";
  return "pending_token";
}

function isValidMetaId(value: string) {
  return /^\d{8,32}$/.test(value);
}

function isValidWebhookToken(value: string) {
  return /^[a-zA-Z0-9._\-]{8,128}$/.test(value);
}

function isValidE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const appBaseUrl = getAppBaseUrl(req);
  const webhookCallbackUrl = `${appBaseUrl}/api/whatsapp/webhook`;

  const accounts = await prisma.waAccount.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      phoneNumberId: true,
      wabaId: true,
      businessId: true,
      status: true,
      qualityRating: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
      accessToken: true,
      webhookVerifyToken: true,
    },
  });

  return NextResponse.json({
    success: true,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      phoneNumber: account.phoneNumber,
      phoneNumberId: account.phoneNumberId,
      wabaId: account.wabaId,
      businessId: account.businessId,
      status: account.status,
      qualityRating: account.qualityRating,
      lastSyncAt: account.lastSyncAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      hasAccessToken: Boolean(account.accessToken),
      hasWebhookVerifyToken: Boolean(account.webhookVerifyToken),
    })),
    auth: {
      role: auth.role,
      canManageAccounts: hasRoleAtLeast(auth.role, "admin"),
    },
    setup: {
      webhookCallbackUrl,
      graphApiVersion: readRequired(process.env.WHATSAPP_GRAPH_API_VERSION) || "v22.0",
    },
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

    let body: CreateAccountBody;
    try {
      body = (await req.json()) as CreateAccountBody;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const accountId = readOptional(body.accountId);
    const name = readRequired(body.name);
    const phoneNumber = normalizePhone(readRequired(body.phoneNumber));
    const phoneNumberId = readRequired(body.phoneNumberId);
    const wabaId = readRequired(body.wabaId);
    const businessId = readOptional(body.businessId);
    const accessToken = readOptional(body.accessToken);
    const webhookVerifyToken = readOptional(body.webhookVerifyToken);

    if (!name || !phoneNumber || !phoneNumberId || !wabaId) {
      return NextResponse.json(
        {
          success: false,
          error: "name, phoneNumber, phoneNumberId and wabaId are required",
        },
        { status: 400 }
      );
    }

    if (!isValidE164(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "phoneNumber must be in E.164 format (example: +919876543210)" },
        { status: 400 }
      );
    }

    if (!isValidMetaId(phoneNumberId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Meta phoneNumberId format" },
        { status: 400 }
      );
    }

    if (!isValidMetaId(wabaId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Meta wabaId format" },
        { status: 400 }
      );
    }

    if (businessId && !isValidMetaId(businessId)) {
      return NextResponse.json(
        { success: false, error: "Invalid Meta businessId format" },
        { status: 400 }
      );
    }

    if (webhookVerifyToken && !isValidWebhookToken(webhookVerifyToken)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook verify token must be 8-128 chars and use letters, numbers, dot, underscore or dash",
        },
        { status: 400 }
      );
    }

    if (accessToken && accessToken.length < 30) {
      return NextResponse.json(
        { success: false, error: "Access token looks invalid (too short)" },
        { status: 400 }
      );
    }

    const existingByPhone = await prisma.waAccount.findFirst({
      where: {
        tenantId: auth.tenantId,
        phoneNumber,
      },
      select: { id: true },
    });

    const existingByPhoneId = await prisma.waAccount.findFirst({
      where: {
        tenantId: auth.tenantId,
        phoneNumberId,
      },
      select: { id: true },
    });

    if (
      existingByPhone &&
      existingByPhoneId &&
      existingByPhone.id !== existingByPhoneId.id &&
      (!accountId || (accountId !== existingByPhone.id && accountId !== existingByPhoneId.id))
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "phoneNumber and phoneNumberId are already mapped to two different accounts. Edit one account at a time.",
        },
        { status: 409 }
      );
    }

    const targetId = accountId || existingByPhone?.id || existingByPhoneId?.id || null;
    if (accountId) {
      const target = await prisma.waAccount.findFirst({
        where: { id: accountId, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
      }
    }

    if (existingByPhone && targetId && existingByPhone.id !== targetId) {
      return NextResponse.json(
        { success: false, error: "Phone number is already connected to another account" },
        { status: 409 }
      );
    }

    if (existingByPhoneId && targetId && existingByPhoneId.id !== targetId) {
      return NextResponse.json(
        { success: false, error: "Phone number ID is already connected to another account" },
        { status: 409 }
      );
    }

    const computedStatus = toStatusLabel({
      accessToken,
      webhookVerifyToken,
    });

    const account = targetId
      ? await prisma.waAccount.update({
          where: { id: targetId },
          data: {
            name,
            phoneNumber,
            phoneNumberId,
            wabaId,
            businessId,
            accessToken,
            webhookVerifyToken,
            status: computedStatus,
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
            createdAt: true,
          },
        })
      : await prisma.waAccount.create({
          data: {
            tenantId: auth.tenantId,
            name,
            phoneNumber,
            phoneNumberId,
            wabaId,
            businessId,
            accessToken,
            webhookVerifyToken,
            status: computedStatus,
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
            createdAt: true,
          },
        });

    await writeAuditLog({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: targetId ? "tenant.whatsapp.account.update" : "tenant.whatsapp.account.create",
      entity: "WaAccount",
      entityId: account.id,
      meta: {
        phoneNumber: account.phoneNumber,
        wabaId: account.wabaId,
        status: account.status,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      mode: targetId ? "updated" : "created",
      account,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save account",
      },
      { status: 500 }
    );
  }
}
