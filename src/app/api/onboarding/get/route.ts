import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    // 🔐 Validate Token
    const tokenData = getTokenData(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🎯 Get userId & tenantId
    const { userId } = tokenData;

    // 📌 Fetch onboarding details for the logged-in user
    const onboarding = await prisma.onboarding.findUnique({
      where: { userId: userId },
    });

    return NextResponse.json({
      success: true,
      onboarding: onboarding || null,
    });

  } catch (err) {
    console.error("Onboarding GET error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
