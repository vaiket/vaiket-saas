import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// ✅ REQUIRED by Next.js Proxy system
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔓 Public routes (no auth)
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

  // ✅ Allow public routes
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 🔐 Check JWT cookie
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ⚠️ Edge-safe check (DO NOT verify here)
  const decoded = jwt.decode(token);

  if (!decoded) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// ✅ Required matcher
export const config = {
  matcher: ["/dashboard/:path*"],
};
