import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
    }

    const { userId, tenantId } = decoded;

    const body = await req.json();
    const { phone, website, about, services, pricing, tone } = body;

    await prisma.onboarding.upsert({
      where: { userId },
      update: { phone, website, about, services, pricing, tone },
      create: { userId, tenantId, phone, website, about, services, pricing, tone },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Onboarding Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
