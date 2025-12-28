import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1) Get latest unused OTP
    const record = await prisma.otpRequest.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "OTP not found" }, { status: 400 });
    }

    // ⭐ SAFE EXPIRY CHECK
    const now = new Date();
    const expiresAt = new Date(record.expiresAt);

    if (isNaN(expiresAt.getTime())) {
      console.error("Invalid expiresAt value:", record.expiresAt);
      return NextResponse.json({ error: "Invalid OTP record" }, { status: 500 });
    }

    if (expiresAt < now) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    // 3) Match OTP
    if (record.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // 4) Mark OTP as used
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { used: true },
    });

    // 5) Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const tenant = await prisma.tenant.create({
        data: { name: `${email.split("@")[0]} Company` },
      });

      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: "New User",
          email,
          password: "", // user sets password later
          role: "owner",
        },
      });
    }

    return NextResponse.json({ success: true, userId: user.id, email });

  } catch (err) {
    console.error("Verify OTP ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
