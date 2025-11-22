import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    // Extract JWT token from cookies
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.match(/token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ success: false, error: "No token" });
    }

    // Decode JWT
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const userId = decoded.userId;
    const tenantId = decoded.tenantId;

    // Fetch user and all related info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        profileImage: true,   // MUST ADD THIS FIELD IN PRISMA IF NOT EXISTS
        role: true,
        onboardingCompleted: true,
        tenant: {
          select: {
            id: true,
            name: true,
            country: true,
            timezone: true,
            createdAt: true,
            settings: true,
            smtpCredentials: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" });
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (err) {
    console.error("❌ /api/auth/me Error:", err);
    return NextResponse.json({ success: false, error: "Invalid token" });
  }
}
