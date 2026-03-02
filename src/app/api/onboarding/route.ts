import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    const { userId, tenantId } = decoded;

    const body = await req.json();
    const {
      phone,
      website,
      about,
      services,
      pricing,
      tone,
      businessName,
      // category // schema me abhi nahi hai, isliye ignore kar rahe
    } = body;

    // 🟦 Save onboarding data for user+tenant
    await prisma.onboarding.upsert({
      where: { userId },
      update: {
        phone,
        website,
        about,
        services,
        pricing,
        tone,
        businessName,
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
        businessName,
      },
    });

    // 🟦 Update tenant name with businessName (so AI ko proper naam mile)
    if (businessName) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: businessName,
        },
      });
    }

    // 🟦 Update AI tone in tenant settings
    await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        tone: tone || "professional",
        aiMode: tone || "professional",
      },
      create: {
        tenantId,
        tone: tone || "professional",
        aiMode: tone || "professional",
      },
    });

    // 🟦 Mark onboarding as completed for this user
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    const refreshedToken = jwt.sign(
      {
        userId,
        email: decoded?.email,
        tenantId,
        role: decoded?.role,
        jti: decoded?.jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set("token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("Onboarding Error:", err);
    return NextResponse.json(
      { success: false, error: "Server Error" },
      { status: 500 }
    );
  }
}
