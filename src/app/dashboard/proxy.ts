// src/app/dashboard/proxy.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

/**
 * Proxy guard for the entire /dashboard route segment.
 * - Must be placed at src/app/dashboard/proxy.ts
 * - Runs server-side before any page in /dashboard renders
 * - Checks JWT token cookie -> verifies subscription in DB
 * - Redirects to /payment-required if not active
 *
 * NOTE: Adjust cookie name ("token") and jwt payload shape to your app.
 */

export default async function proxy(request: Request) {
  try {
    // 1) read token cookie
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    // If no token -> redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 2) verify token (JWT)
    let tokenData: any;
    try {
      tokenData = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      console.error("proxy: invalid token", err);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userId = tokenData.userId ?? tokenData.id ?? null;
    const tenantId = tokenData.tenantId ?? null;

    if (!userId || !tenantId) {
      console.error("proxy: token missing userId/tenantId");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 3) check subscription for this user OR tenant
    //    (we allow either user-level subscription or tenant-level active subscription)
    const activeSubscription = await prisma.userSubscription.findFirst({
      where: {
        OR: [
          { userId: userId, status: "ACTIVE" },
          { tenantId: tenantId, status: "ACTIVE" }
        ]
      }
    });

    if (!activeSubscription) {
      // Not paid -> redirect to payment-required page
      return NextResponse.redirect(new URL("/payment-required", request.url));
    }

    // 4) subscription ok -> allow request to proceed
    return NextResponse.next();
  } catch (err) {
    console.error("proxy error:", err);
    // On unexpected error, be safe: redirect to payment-required or login
    return NextResponse.redirect(new URL("/payment-required", request.url));
  }
}
