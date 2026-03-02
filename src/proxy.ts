import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/favicon.ico",
  ];

  const publicPrefixes = [
    "/_next",
    "/static",
    "/public",
    "/assets",
    "/.well-known",
  ];

  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Only presence check at edge; token verification happens in API routes.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
