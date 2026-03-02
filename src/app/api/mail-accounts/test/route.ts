import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,   // true → SSL (465), false → STARTTLS (587)
    } = body;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { success: false, error: "Missing SMTP details" },
        { status: 400 }
      );
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure, // true = SSL (465), false = STARTTLS (587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed SSL certificates
      },
    });

    // VERIFY connection
    const verifyResult = await transporter.verify();

    if (verifyResult === true) {
      return NextResponse.json(
        { success: true, message: "SMTP Connected Successfully ✔" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: verifyResult },
      { status: 400 }
    );

  } catch (error: any) {
    let msg = error?.message || "Unknown SMTP Error";

    // Improve error messages
    if (msg.includes("Invalid login")) msg = "❌ SMTP Login Failed — Wrong Email/Password";
    if (msg.includes("ENOTFOUND")) msg = "❌ SMTP Host Not Found — Wrong Server Hostname";
    if (msg.includes("ECONNREFUSED")) msg = "❌ Connection Refused — Wrong Port or Server Blocked";
    if (msg.includes("ETIMEDOUT")) msg = "❌ Connection Timeout — Server Not Responding";
    if (msg.includes("CERT")) msg = "❌ SSL Problem — Try disable SSL or use port 587";

    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
