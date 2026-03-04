import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type CheckStatus = "pass" | "warn" | "fail";

type HealthCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  message: string;
  detail?: string;
};

type GraphResponse = {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string | null;
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function readBoolean(value: string | undefined): boolean | null {
  const text = readText(value).toLowerCase();
  if (!text) return null;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return null;
}

function graphVersion() {
  return readText(process.env.WHATSAPP_GRAPH_API_VERSION) || "v22.0";
}

function isValidE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function isLikelyLocalhost(url: string) {
  const lowered = url.toLowerCase();
  return lowered.includes("localhost") || lowered.includes("127.0.0.1");
}

function getAppBaseUrl(req: Request) {
  const envBase = readText(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  if (envBase) return envBase.replace(/\/+$/g, "");

  const requestUrl = new URL(req.url);
  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

async function fetchMetaGraph(params: {
  accessToken: string;
  resourceId: string;
  fields: string;
}): Promise<GraphResponse> {
  const endpoint = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(
    params.resourceId
  )}?fields=${encodeURIComponent(params.fields)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const payloadError =
        payload && typeof payload.error === "object"
          ? (payload.error as Record<string, unknown>)
          : null;
      return {
        ok: false,
        status: res.status,
        data: payload,
        error:
          readText(payloadError?.message) ||
          readText(payload?.message) ||
          `Meta Graph error (${res.status})`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: payload,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Meta request timeout"
            : error.message
          : "Meta request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function countByStatus(checks: HealthCheck[], status: CheckStatus) {
  return checks.filter((item) => item.status === status).length;
}

function requiresWebhookSignature() {
  const explicit = readBoolean(process.env.WHATSAPP_WEBHOOK_REQUIRE_SIGNATURE);
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "production";
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
      return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
    }

    const account = await prisma.waAccount.findFirst({
      where: {
        id: accountId,
        tenantId: auth.tenantId,
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
        accessToken: true,
        webhookVerifyToken: true,
        lastSyncAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const appBaseUrl = getAppBaseUrl(req);
    const webhookCallbackUrl = `${appBaseUrl}/api/whatsapp/webhook`;

    const checks: HealthCheck[] = [];

    checks.push({
      key: "phone_format",
      label: "Phone format",
      status: isValidE164(account.phoneNumber) ? "pass" : "fail",
      message: isValidE164(account.phoneNumber)
        ? "Phone number is in E.164 format."
        : "Phone number must be E.164 (example: +919876543210).",
    });

    checks.push({
      key: "access_token",
      label: "Access token",
      status: account.accessToken ? "pass" : "fail",
      message: account.accessToken
        ? "Access token is saved."
        : "Missing access token. Outbound sends and template sync will fail.",
    });

    checks.push({
      key: "webhook_token",
      label: "Webhook verify token",
      status: account.webhookVerifyToken ? "pass" : "warn",
      message: account.webhookVerifyToken
        ? "Webhook verify token is saved."
        : "Webhook verify token is missing. Meta verification cannot complete.",
    });

    checks.push({
      key: "callback_url",
      label: "Webhook callback URL",
      status: isLikelyLocalhost(webhookCallbackUrl) ? "warn" : "pass",
      message: isLikelyLocalhost(webhookCallbackUrl)
        ? "Using localhost callback URL. Use a public HTTPS domain in production."
        : "Callback URL looks public.",
      detail: webhookCallbackUrl,
    });

    const signatureRequired = requiresWebhookSignature();
    const hasWebhookAppSecret = Boolean(
      readText(process.env.WHATSAPP_WEBHOOK_APP_SECRET) || readText(process.env.META_APP_SECRET)
    );
    checks.push({
      key: "webhook_signature",
      label: "Webhook signature validation",
      status: hasWebhookAppSecret ? "pass" : signatureRequired ? "fail" : "warn",
      message: hasWebhookAppSecret
        ? "App secret is available for validating x-hub-signature-256."
        : signatureRequired
          ? "Missing META_APP_SECRET/WHATSAPP_WEBHOOK_APP_SECRET while signature validation is required."
          : "Signature validation is optional here; set WHATSAPP_WEBHOOK_APP_SECRET for stricter security.",
    });

    let remotePhone: GraphResponse | null = null;
    let remoteWaba: GraphResponse | null = null;

    if (account.accessToken) {
      remotePhone = await fetchMetaGraph({
        accessToken: account.accessToken,
        resourceId: account.phoneNumberId,
        fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status",
      });

      remoteWaba = await fetchMetaGraph({
        accessToken: account.accessToken,
        resourceId: account.wabaId,
        fields: "id,name",
      });
    }

    checks.push({
      key: "meta_phone_id",
      label: "Meta phone_number_id",
      status: remotePhone ? (remotePhone.ok ? "pass" : "fail") : "warn",
      message: remotePhone
        ? remotePhone.ok
          ? "Meta accepted phone_number_id."
          : "Meta rejected phone_number_id request."
        : "Skipped (missing access token).",
      detail: remotePhone?.error || undefined,
    });

    checks.push({
      key: "meta_waba_id",
      label: "Meta WABA ID",
      status: remoteWaba ? (remoteWaba.ok ? "pass" : "fail") : "warn",
      message: remoteWaba
        ? remoteWaba.ok
          ? "Meta accepted WABA ID."
          : "Meta rejected WABA ID request."
        : "Skipped (missing access token).",
      detail: remoteWaba?.error || undefined,
    });

    const phoneData = (remotePhone?.data || {}) as Record<string, unknown>;
    const qualityRating = readText(phoneData.quality_rating) || null;
    const verificationStatus =
      readText(phoneData.code_verification_status) || readText(phoneData.name_status);

    checks.push({
      key: "number_verification",
      label: "Phone number verification",
      status: !verificationStatus
        ? "warn"
        : verificationStatus.toLowerCase().includes("verified") ||
            verificationStatus.toLowerCase().includes("approved")
          ? "pass"
          : "warn",
      message: verificationStatus
        ? `Meta verification status: ${verificationStatus}`
        : "Verification state not returned by Meta yet.",
    });

    const failCount = countByStatus(checks, "fail");
    const warnCount = countByStatus(checks, "warn");
    const passCount = countByStatus(checks, "pass");
    const isReady = failCount === 0;

    const nextStatus = failCount > 0 ? "action_required" : warnCount > 0 ? "connected" : "ready";

    await prisma.waAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        qualityRating: qualityRating || account.qualityRating,
        status: nextStatus,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        phoneNumber: account.phoneNumber,
        phoneNumberId: account.phoneNumberId,
        wabaId: account.wabaId,
        businessId: account.businessId,
        status: nextStatus,
        qualityRating: qualityRating || account.qualityRating,
        lastSyncAt: new Date().toISOString(),
      },
      setup: {
        webhookCallbackUrl,
        graphApiVersion: graphVersion(),
      },
      checks,
      summary: {
        ready: isReady,
        passCount,
        warnCount,
        failCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run account health checks",
      },
      { status: 500 }
    );
  }
}
