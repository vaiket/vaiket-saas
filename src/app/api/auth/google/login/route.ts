// src/app/api/auth/google/login/route.ts
import { NextResponse } from "next/server";

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function getPublicBaseUrl(req: Request) {
  const envBase = readText(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.BASE_URL
  );
  if (envBase && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(envBase)) {
    return envBase.replace(/\/+$/g, "");
  }

  const requestUrl = new URL(req.url);
  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(":", "");
  const normalizedHost = host.startsWith("0.0.0.0:")
    ? host.replace("0.0.0.0", "app.vaiket.com")
    : host.startsWith("localhost:")
    ? host.replace("localhost", "app.vaiket.com")
    : host;

  return `${proto}://${normalizedHost}`;
}

function getGoogleRedirectUri(req: Request) {
  const configured = readText(process.env.GOOGLE_REDIRECT_URI);
  if (configured && !(process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(configured))) {
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
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  params.set("state", state);

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
