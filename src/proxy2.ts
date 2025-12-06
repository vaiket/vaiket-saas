import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // PUBLIC ROUTES (no login required)
  const publicRoutes = [
    "/",
    "/pricing",            // ← ADDED 
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/register",
    "/favicon.ico",
  ];

  // Allow static files
  const publicPrefixes = [
    "/_next",
    "/static",
    "/assets",
    "/public",
    "/.well-known",
  ];

  // Allow if path is PUBLIC
  if (
    publicRoutes.includes(pathname) ||
    publicPrefixes.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Protected routes → require JWT
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Match only dashboard paths for auth
export const config = {
  matcher: ["/dashboard/:path*"],
};
