import { NextResponse } from "next/server";

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function isLocalHostLike(value: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

function getPublicBaseUrl(req: Request) {
  const incomingUrl = new URL(req.url);
  const requestHostIsLocal = isLocalHostLike(incomingUrl.host);
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
  const host = forwardedHost || readText(req.headers.get("host")) || incomingUrl.host;
  const proto = forwardedProto || incomingUrl.protocol.replace(":", "");
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

export async function GET(req: Request) {
  const incomingUrl = new URL(req.url);
  const targetUrl = new URL("/api/auth/google/login", getPublicBaseUrl(req));

  // Preserve existing query params, if any.
  targetUrl.search = incomingUrl.search;

  return NextResponse.redirect(targetUrl);
}
