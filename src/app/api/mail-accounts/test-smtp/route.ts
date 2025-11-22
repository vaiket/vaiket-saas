import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } =
      await req.json();

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Boolean(smtpSecure),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: "SMTP Connection Successful",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "SMTP Failed: " + err?.message },
      { status: 500 }
    );
  }
}
