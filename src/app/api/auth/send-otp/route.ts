import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { fullName, email, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Store OTP in DB for verification
    await prisma.otpRequest.create({
      data: {
        email,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
      },
    });

    console.log("Generated OTP:", otp);

    // ✅ Configure SMTP Transport — auto secure if port is 465
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // SSL/TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✅ Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial; font-size: 16px">
          <p>Hello <b>${fullName}</b>,</p>
          <p>Your verification OTP is:</p>
          <h2 style="color: #3b82f6;">${otp}</h2>
          <p>This OTP is valid for 5 minutes.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "OTP Sent" });

  } catch (err: any) {
    console.error("Send OTP Error =>", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
