import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value ?? null;

    if (!token) {
      const cookieHeader = req.headers.get("cookie") ?? "";
      token = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? null;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - missing token" },
        { status: 401 }
      );
    }

    try {
      token = decodeURIComponent(token);
    } catch {
      // no-op
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = Number(decoded?.userId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token payload" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        profileImage: true,
        role: true,
        onboardingCompleted: true,
        tenantId: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, error: "User is inactive" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("/api/auth/me error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
