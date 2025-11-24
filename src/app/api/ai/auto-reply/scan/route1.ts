import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import nodemailer from "nodemailer";
import { ensureTenantSettings } from "@/lib/ensureTenantSettings";

export async function POST() {
  try {
    // ✅ STEP 1 — AUTH CHECK
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    const tenantId = decoded.tenantId;

    // ✅ Ensure tenant settings exist
    await ensureTenantSettings(tenantId);

    // ✅ STEP 2 — CHECK AUTO-REPLY SETTING
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings || !settings.autoReply) {
      return NextResponse.json({
        success: true,
        message: "Auto-reply OFF. No action.",
      });
    }

    // ✅ STEP 3 — GET ONE UNPROCESSED MAIL
    const mail = await prisma.incomingEmail.findFirst({
      where: { tenantId, processed: false },
      orderBy: { createdAt: "asc" },
    });

    if (!mail) {
      return NextResponse.json({
        success: true,
        message: "No new messages",
      });
    }

    // ✅ STEP 4 — GET SMTP ACCOUNT
    const mailAccount = await prisma.mailAccount.findFirst({
      where: { tenantId, active: true },
    });

    if (!mailAccount) {
      return NextResponse.json({
        success: false,
        error: "Mail account not configured",
      });
    }

    const myEmail = mailAccount.email;
    const customerEmail = mail.from || mail.to;

    if (!customerEmail) {
      console.log("Skipping — missing recipient");
      return NextResponse.json({
        success: false,
        error: "Missing customer email",
      });
    }

    // ✅ STEP 5 — GENERATE AI REPLY
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const aiPrompt = `
You are an AI business assistant. Reply professionally.

Customer message:
"${mail.body}"
`;

    const aiRes = await client.chat.completions.create({
      model: settings.aiModel || "gpt-4o-mini",
      messages: [{ role: "user", content: aiPrompt }],
      max_tokens: 200,
    });

    const replyText =
      aiRes.choices[0].message.content ||
      "Thank you for your message. We will get back shortly.";

    // ✅ STEP 6 — SEND VIA SMTP
    const transporter = nodemailer.createTransport({
      host: mailAccount.smtpHost,
      port: mailAccount.smtpPort,
      secure: mailAccount.smtpSecure,
      auth: {
        user: mailAccount.smtpUser,
        pass: mailAccount.smtpPass,
      },
    });

    await transporter.sendMail({
      from: myEmail,
      to: customerEmail,
      subject: `Re: ${mail.subject || ""}`,
      text: replyText,
      html: `<pre>${replyText}</pre>`,
    });

    // ✅ STEP 7 — LOG OUTGOING MAIL
    await prisma.mailLog.create({
      data: {
        mailAccountId: mailAccount.id,
        type: "outgoing",
        from: myEmail,
        to: customerEmail,
        subject: `Re: ${mail.subject || ""}`,
        body: replyText,
        status: "sent",
      },
    });

    // ✅ STEP 8 — MARK ORIGINAL MAIL PROCESSED
    await prisma.incomingEmail.update({
      where: { id: mail.id },
      data: { processed: true },
    });

    return NextResponse.json({
      success: true,
      message: "AI replied successfully",
      reply: replyText,
    });

  } catch (err: any) {
    console.error("AUTO REPLY ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
