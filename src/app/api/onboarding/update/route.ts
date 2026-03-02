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

    const { userId, tenantId } = tokenData;

    const body = await req.json();
    const {
      businessName,
      phone,
      website,
      about,
      services,
      pricing,
      tone,
    } = body;

    // Upsert onboarding record
    const updated = await prisma.onboarding.upsert({
      where: { userId },
      update: {
        businessName,
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
        businessName,
        phone,
        website,
        about,
        services,
        pricing,
        tone,
      },
    });

    return NextResponse.json({
      success: true,
      onboarding: updated,
      message: "Onboarding updated successfully!",
    });

  } catch (err) {
    console.error("Onboarding UPDATE error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
