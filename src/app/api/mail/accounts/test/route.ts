import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

export async function POST(req: Request) {
  try {
    const {
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      imapHost,
      imapPort,
      imapUser,
      imapPass,
    } = await req.json();

    // ---------- ✅ TEST SMTP ----------
    async function testSMTP(): Promise<string> {
      return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: Number(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        transporter.verify((err) => {
          if (err) reject("SMTP Failed: " + err.message);
          else resolve("SMTP Connected ✅");
        });
      });
    }

    // ---------- ✅ TEST IMAP ----------
    async function testIMAP(): Promise<string> {
      const client = new ImapFlow({
        host: imapHost,
        port: Number(imapPort),
        secure: true,
        tls: { rejectUnauthorized: false },
        auth: {
          user: imapUser,
          pass: imapPass,
        },
      });

      try {
        await client.connect();
        await client.logout();
        return "IMAP Connected ✅";
      } catch (err: any) {
        return "IMAP Failed: " + err.message;
      }
    }

    // Run both tests
    const smtpResult = await testSMTP().catch((e) => e);
    const imapResult = await testIMAP();

    return NextResponse.json({
      success: true,
      smtp: smtpResult,
      imap: imapResult,
    });
  } catch (err) {
    console.error("TEST ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Error testing connection" },
      { status: 500 }
    );
  }
}
