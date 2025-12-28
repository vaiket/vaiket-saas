// src/app/dashboard/proxy.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export default async function proxy(request: Request) {
  try {
    // ✅ FIX — await cookies()
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    // If no token -> redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // ✅ verify token
    let tokenData: any;
    try {
      tokenData = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userId = tokenData.userId ?? tokenData.id ?? null;
    const tenantId = tokenData.tenantId ?? null;

    if (!userId || !tenantId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // ✅ Check subscription
    const activeSubscription = await prisma.userSubscription.findFirst({
      where: {
        OR: [
          { userId, status: "ACTIVE" },
          { tenantId, status: "ACTIVE" }
        ]
      }
    });

    if (!activeSubscription) {
      return NextResponse.redirect(new URL("/payment-required", request.url));
    }

    // ✅ allow dashboard access
    return NextResponse.next();

  } catch (err) {
    console.error("proxy error:", err);
    return NextResponse.redirect(new URL("/payment-required", request.url));
  }
}
