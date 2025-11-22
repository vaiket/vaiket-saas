// src/app/api/mail-inbox/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    // -------------------------
    // 1) Auth check
    // -------------------------
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
    }

    const tenantId = decoded.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 400 });
    }

    // -------------------------
    // 2) Read input
    // -------------------------
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: "Missing to/subject/body" },
        { status: 400 }
      );
    }

    // -------------------------
    // 3) Get this tenant's SMTP account
    // -------------------------
    const mailAccount = await prisma.mailAccount.findFirst({
      where: { tenantId, active: true },
    });

    if (!mailAccount) {
      return NextResponse.json(
        { success: false, error: "No active SMTP account configured" },
        { status: 400 }
      );
    }

    // -------------------------
    // 4) Nodemailer transport
    // -------------------------
    const transporter = nodemailer.createTransport({
      host: mailAccount.smtpHost,
      port: mailAccount.smtpPort,
      secure: mailAccount.smtpSecure ?? false, // fixes undefined issue
      auth: {
        user: mailAccount.smtpUser,
        pass: mailAccount.smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // some providers require this
      },
    });

    let status = "sent";
    let errorMsg: string | null = null;

    // -------------------------
    // 5) Send mail
    // -------------------------
    try {
      await transporter.sendMail({
        from: mailAccount.email,
        to,
        subject: subject.trim(),
        text: body,
        html: `<div style="white-space:pre-wrap;font-family:Arial">${body}</div>`,
      });
    } catch (err: any) {
      console.error("SMTP ERROR:", err);
      status = "error";
      errorMsg = err?.response || err?.message || "SMTP error";
    }

    // -------------------------
    // 6) Log mail
    // -------------------------
    const log = await prisma.mailLog.create({
      data: {
        mailAccountId: mailAccount.id,
        type: "outgoing",
        to,
        from: mailAccount.email,
        subject,
        body,
        status,
        error: errorMsg || undefined,
      },
    });

    // -------------------------
    // 7) Return response
    // -------------------------
    if (status === "error") {
      return NextResponse.json(
        { success: false, error: errorMsg, logId: log.id },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, logId: log.id });
  } catch (err) {
    console.error("Send API Fatal Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
