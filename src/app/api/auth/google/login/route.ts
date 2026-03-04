// src/app/api/auth/google/login/route.ts
import { NextResponse } from "next/server";

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function isLocalHostLike(value: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

function getPublicBaseUrl(req: Request) {
  const requestUrl = new URL(req.url);
  const requestHostIsLocal = isLocalHostLike(requestUrl.host);
  const envBaseRaw = readText(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.BASE_URL
  );
  const envBase = envBaseRaw.replace(/\/+$/g, "");
  if (envBase) {
    if ((requestHostIsLocal && isLocalHostLike(envBase)) || (!requestHostIsLocal && !isLocalHostLike(envBase))) {
      return envBase;
    }
  }

  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const normalizedHost =
    process.env.NODE_ENV === "production"
      ? host.startsWith("0.0.0.0:")
        ? host.replace("0.0.0.0", "app.vaiket.com")
        : host.startsWith("localhost:")
        ? host.replace("localhost", "app.vaiket.com")
        : host.startsWith("127.0.0.1:")
        ? host.replace("127.0.0.1", "app.vaiket.com")
        : host
      : host.startsWith("0.0.0.0:")
      ? host.replace("0.0.0.0", "localhost")
      : host;

  return `${proto}://${normalizedHost}`;
}

function getGoogleRedirectUri(req: Request) {
  const requestHostIsLocal = isLocalHostLike(new URL(req.url).host);
  const configured = readText(
    requestHostIsLocal
      ? process.env.GOOGLE_REDIRECT_URI_LOCAL || process.env.GOOGLE_REDIRECT_URI
      : process.env.GOOGLE_REDIRECT_URI_PROD || process.env.GOOGLE_REDIRECT_URI
  );
  if (
    configured &&
    ((requestHostIsLocal && isLocalHostLike(configured)) ||
      (!requestHostIsLocal && !isLocalHostLike(configured)))
  ) {
    return configured;
  }

  return `${getPublicBaseUrl(req)}/api/auth/google/callback`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const isGmailConnect = mode === "gmail";
  const intentParam = url.searchParams.get("intent");
  const intent = intentParam === "signup" ? "signup" : "login";

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = getGoogleRedirectUri(req);

  // Keep login/signup on standard profile scopes; Gmail scope only when explicitly connecting mailbox.
  const scopes = isGmailConnect
    ? "openid email profile https://mail.google.com/"
    : "openid email profile";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    include_granted_scopes: "true",
    prompt: isGmailConnect ? "consent" : "select_account",
  });

  if (isGmailConnect) {
    params.set("access_type", "offline");
  }

  const statePayload = {
    intent,
    gmailConnect: isGmailConnect,
    redirectUri,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  params.set("state", state);

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
