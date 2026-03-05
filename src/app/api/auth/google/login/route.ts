// src/app/api/auth/google/login/route.ts
import { NextResponse } from "next/server";
import {
  getGoogleOAuthClientConfig,
  getGoogleRedirectUri,
  getPublicBaseUrl,
} from "@/lib/url/public-base";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const isGmailConnect = mode === "gmail";
  const intentParam = url.searchParams.get("intent");
  const intent = intentParam === "signup" ? "signup" : "login";

  const appBaseUrl = getPublicBaseUrl(req);
  const { clientId } = getGoogleOAuthClientConfig(req);
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google_config", appBaseUrl));
  }

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
