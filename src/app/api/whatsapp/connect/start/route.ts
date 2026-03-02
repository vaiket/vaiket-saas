import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type OAuthStatePayload = {
  nonce: string;
  tenantId: number;
  userId: number;
  expiresAt: number;
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function getGraphVersion() {
  return readText(process.env.WHATSAPP_GRAPH_API_VERSION) || "v22.0";
}

function getOAuthScopes() {
  const configured = readText(process.env.META_OAUTH_SCOPES);
  if (configured) {
    return configured
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",");
  }

  // Keep default to a single fetch-oriented scope to reduce connect failures
  // on apps that do not yet have full messaging permission grants.
  return "whatsapp_business_management";
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

function encodePayload(payload: OAuthStatePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.redirect(
      new URL("/dashboard/whatsapp/accounts?connect=forbidden", req.url)
    );
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) {
    return NextResponse.redirect(
      new URL("/dashboard/whatsapp/subscription?billing=required", req.url)
    );
  }

  const appId = readText(process.env.META_APP_ID);
  const appSecret = readText(process.env.META_APP_SECRET);

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL("/dashboard/whatsapp/accounts?connect=config_error", req.url)
    );
  }

  const appBaseUrl = getAppBaseUrl(req);
  const redirectUri =
    readText(process.env.META_REDIRECT_URI) || `${appBaseUrl}/api/whatsapp/connect/callback`;

  const nonce = randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const statePayload: OAuthStatePayload = {
    nonce,
    tenantId: auth.tenantId,
    userId: auth.userId,
    expiresAt,
  };

  const state = encodePayload(statePayload);

  const oauthUrl = new URL(`https://www.facebook.com/${getGraphVersion()}/dialog/oauth`);
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", getOAuthScopes());
  oauthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("wa_connect_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
