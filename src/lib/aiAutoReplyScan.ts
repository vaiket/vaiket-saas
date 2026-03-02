// src/lib/aiAutoReplyScan.ts
import OpenAI from "openai";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

/**
 * Run AI auto-reply for a single tenant
 * - finds unprocessed incoming mails
 * - generates reply using OpenAI
 * - sends via SMTP configured for tenant
 * - logs outgoing and marks incoming processed
 */
export async function autoReplyScan(tenantId: number) {
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });

  if (!settings || !settings.autoReply) {
    return { ok: true, message: "Auto-reply disabled" };
  }

  // Get 1 (or few) unprocessed messages
  const pending = await prisma.incomingEmail.findMany({
    where: { tenantId, processed: false },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  if (!pending.length) return { ok: true, message: "No pending messages" };

  // get SMTP account for tenant
  const smtp = await prisma.mailAccount.findFirst({ where: { tenantId, active: true } });
  if (!smtp) return { ok: false, error: "No SMTP account configured" };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  let processedCount = 0;

  for (const mail of pending) {
    try {
      // Build prompt using tenant settings
      const prompt = `${settings.aiPrimary || "You are a helpful business assistant."}
Tone: ${settings.tone || "professional"}
Customer message:
${mail.body || mail.subject || ""}

Write a concise, helpful reply in plain text.`;

      const response = await client.chat.completions.create({
        model: settings.aiModel || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
      });

      const aiReply = response.choices?.[0].message?.content?.trim() || "Thanks — we received your message and will follow up shortly.";

      // send via SMTP
      const transporter = nodemailer.createTransport({
        host: smtp.smtpHost,
        port: smtp.smtpPort,
        secure: !!smtp.smtpSecure,
        auth: { user: smtp.smtpUser!, pass: smtp.smtpPass! },
      });

      await transporter.sendMail({
        from: smtp.email,
        to: mail.from || mail.to || "",
        subject: `Re: ${mail.subject || ""}`,
        text: aiReply,
        html: `<pre>${aiReply}</pre>`,
      });

      // log outgoing
      await prisma.mailLog.create({
        data: {
          mailAccountId: smtp.id,
          type: "outgoing",
          to: mail.from || mail.to || "",
          from: smtp.email,
          subject: `Re: ${mail.subject || ""}`,
          body: aiReply,
          status: "sent",
        },
      });

      // mark processed
      await prisma.incomingEmail.update({
        where: { id: mail.id },
        data: { processed: true },
      });

      processedCount++;
    } catch (err) {
      console.error("autoReplyScan error for mail id", mail.id, err);
      // optionally set a processed/failure flag or retry count
      await prisma.mailLog.create({
        data: {
          mailAccountId: smtp?.id || undefined,
          type: "outgoing",
          to: mail.from || mail.to || "",
          from: smtp?.email || "noreply",
          subject: `Re: ${mail.subject || ""}`,
          body: `AUTO-REPLY FAILED: ${String(err).slice(0,200)}`,
          status: "error",
          error: String(err).slice(0,1000),
        },
      });
      // mark processed true to prevent infinite loop? Up to you. If you want retries keep processed=false and track retries.
      await prisma.incomingEmail.update({
        where: { id: mail.id },
        data: { processed: true },
      });
    }
  }

  return { ok: true, processedCount };
}
