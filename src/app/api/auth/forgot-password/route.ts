// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // check user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    // generate otp and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.otpRequest.create({
      data: { email, otp, expiresAt },
    });

    console.log("RESET OTP =>", otp);

    // transporter (cPanel safe config)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your password reset OTP",
      html: `
        <div style="font-family:Arial;padding:12px">
          <h3>Password reset request</h3>
          <p>Your OTP code is:</p>
          <h2 style="color:#2563EB">${otp}</h2>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
