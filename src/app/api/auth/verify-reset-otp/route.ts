// src/app/api/auth/verify-reset-otp/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find OTP
    const record = await prisma.otpRequest.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "OTP not found" }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Update password
    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hash },
    });

    return NextResponse.json({ success: true, message: "Password updated" });

  } catch (err) {
    console.error("Reset Verify Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
