import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import imaps from "imap-simple";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      imapSecure,
    } = body;

    // TEST SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Boolean(smtpSecure),
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.verify();
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        message: "SMTP Failed: " + err.message,
      });
    }

    // TEST IMAP
    try {
      const config = {
        imap: {
          user: imapUser,
          password: imapPass,
          host: imapHost,
          port: Number(imapPort),
          tls: Boolean(imapSecure),
          authTimeout: 15000,
          tlsOptions: { rejectUnauthorized: false },
        },
      };

      const connection = await imaps.connect(config);
      await connection.openBox("INBOX");
      await connection.end();
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        message: "IMAP Failed: " + err.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: "SMTP + IMAP Connection Successful!",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" });
  }
}
