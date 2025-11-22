import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import Imap from "imap";

export async function POST(req: Request) {
  try {
    const data = await req.json();

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
    } = data;

    // ---------- TEST SMTP ----------
    async function testSMTP() {
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

        transporter.verify((err, success) => {
          if (err) reject("SMTP Failed: " + err.message);
          else resolve("SMTP Connected");
        });
      });
    }

    // ---------- TEST IMAP ----------
    async function testIMAP() {
      return new Promise((resolve, reject) => {
        const imap = new Imap({
          user: imapUser,
          password: imapPass,
          host: imapHost,
          port: Number(imapPort),
          tls: true,
        });

        imap.once("ready", () => {
          imap.end();
          resolve("IMAP Connected");
        });

        imap.once("error", (err) => {
          reject("IMAP Failed: " + err.message);
        });

        imap.connect();
      });
    }

    // Run tests
    const smtpResult = await testSMTP().catch((e) => e);
    const imapResult = await testIMAP().catch((e) => e);

    const finalMessage = `SMTP: ${smtpResult}\nIMAP: ${imapResult}`;

    return NextResponse.json({ success: true, message: finalMessage });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Error testing connection" });
  }
}
