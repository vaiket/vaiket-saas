import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    // ✅ Read token from cookies header
    const cookieHeader = req.headers.get("cookie") ?? "";
    const token = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — missing token" },
        { status: 401 }
      );
    }

    // ✅ Verify and decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const tenantId = decoded.tenantId;

    // ✅ Fetch minimal safe user info
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
        tenantId: true, // ✅ required
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("❌ /api/auth/me Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
