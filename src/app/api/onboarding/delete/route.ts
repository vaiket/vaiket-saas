import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = tokenData;

    // Check if onboarding exists
    const exists = await prisma.onboarding.findUnique({
      where: { userId },
    });

    if (!exists) {
      return NextResponse.json({
        success: false,
        error: "No onboarding data found",
      });
    }

    // Delete onboarding record
    await prisma.onboarding.delete({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding deleted successfully!",
    });

  } catch (err) {
    console.error("Onboarding DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
