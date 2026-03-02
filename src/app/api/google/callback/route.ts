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

  const incomingUrl = new URL(req.url);
  const forwardedProto = readText(req.headers.get("x-forwarded-proto"));
  const forwardedHost = readText(req.headers.get("x-forwarded-host"));
  const host = forwardedHost || readText(req.headers.get("host")) || incomingUrl.host;
  const proto = forwardedProto || incomingUrl.protocol.replace(":", "");
  const normalizedHost = host.startsWith("0.0.0.0:")
    ? host.replace("0.0.0.0", "app.vaiket.com")
    : host.startsWith("localhost:")
    ? host.replace("localhost", "app.vaiket.com")
    : host;

  return `${proto}://${normalizedHost}`;
}

export async function GET(req: Request) {
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL("/api/auth/google/callback", getPublicBaseUrl(req));
  targetUrl.search = incomingUrl.search;

  return NextResponse.redirect(targetUrl);
}
