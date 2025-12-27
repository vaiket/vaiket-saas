import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// ⭐ Next.js 16 REQUIRED function:
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // PUBLIC ROUTES
  const publicRoutes = [
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/favicon.ico",
    "/",
  ];

  const publicPrefixes = [
    "/_next",
    "/static",
    "/public",
    "/assets",
    "/.well-known",
  ];

  // Allow public pages
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// ⭐ Required matcher
export const config = {
  matcher: ["/dashboard/:path*"],
};
