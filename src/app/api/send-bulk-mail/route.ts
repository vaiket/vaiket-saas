import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const { emails, subject, content } = await req.json();

  const transporter = nodemailer.createTransport({
    host: "mail.vaiket.com",
    port: 587,
    secure: false,
    auth: {
      user: "info@vaiket.com",
      pass: "PASSWORD_HERE",
    },
  });

  const results = [];

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: "Vaiket <info@vaiket.com>",
        to: email,
        subject,
        html: content,
      });

      results.push({ email, status: "success" });
    } catch (err: any) {
      results.push({ email, status: "failed", error: err.message });
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  return NextResponse.json({ results });
}
