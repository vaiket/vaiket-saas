import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    // 1️⃣ Read JWT token
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    // 2️⃣ Decode token → get userId + tenantId
    let tokenData: any;
    try {
      tokenData = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    const userId = tokenData.userId;
    const tenantId = tokenData.tenantId;

    if (!userId || !tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant/User ID missing" },
        { status: 400 }
      );
    }

    // 3️⃣ Read form data
    const body = await req.json();
    const { phone, website, about, services, pricing, tone } = body;

    // 4️⃣ Upsert onboarding (no duplicates)
    await prisma.onboarding.upsert({
      where: { userId },
      update: {
        phone,
        website,
        about,
        services,
        pricing,
        tone,
      },
      create: {
        userId,
        tenantId,
        phone,
        website,
        about,
        services,
        pricing,
        tone,
      },
    });

    // 5️⃣ Mark onboarding completed
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { success: false, error: "Server Error", details: String(err) },
      { status: 500 }
    );
  }
}
