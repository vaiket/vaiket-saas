// src/app/api/smtp/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );

    const body = await req.json();
    const {
      to,
      subject = "SMTP Test",
      text = "This is a test email from Vaiket.",
      from,
    } = body;

    if (!to)
      return NextResponse.json(
        { success: false, error: "Missing 'to' email address" },
        { status: 400 }
      );

    const creds = await prisma.smtpCredentials.findUnique({
      where: { tenantId: token.tenantId },
    });

    if (!creds)
      return NextResponse.json(
        { success: false, error: "No SMTP credentials set for tenant" },
        { status: 404 }
      );

    const port = Number(creds.port);

    const transporter = nodemailer.createTransport({
      host: creds.host!,
      port,
      secure: port === 465, // ✅ FIX — clean & type-safe
      auth: {
        user: creds.username!,
        pass: creds.password!,
      },
      tls: {
        rejectUnauthorized: false, // ✅ allows cPanel/shared hosting
      },
    });

    // ✅ verify SMTP config first
    await transporter.verify();

    const info = await transporter.sendMail({
      from: from || process.env.DEFAULT_FROM || creds.username!,
      to,
      subject,
      text,
    });

    return NextResponse.json({ success: true, info });
  } catch (err: any) {
    console.error("SMTP test error:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
