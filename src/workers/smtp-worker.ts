// src/workers/smtp-worker.ts
import { Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

// ✅ Redis connection
const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// ✅ Logs worker job events (replaces QueueScheduler)
const queueEvents = new QueueEvents("smtp-send", { connection });

queueEvents.on("completed", ({ jobId }) => {
  console.log(`✅ SMTP job completed: ${jobId}`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ SMTP job failed: ${jobId} — ${failedReason}`);
});

// ✅ Actual email worker
export const worker = new Worker(
  "smtp-send",
  async (job) => {
    const { to, subject, body, accountId } = job.data;

    const acc = await prisma.mailAccount.findUnique({
      where: { id: accountId },
    });

    if (!acc) throw new Error("Mail account not found");

    const transporter = nodemailer.createTransport({
      host: acc.smtpHost,
      port: acc.smtpPort,
      secure: acc.smtpSecure,
      auth: {
        user: acc.smtpUser,
        pass: acc.smtpPass,
      },
    });

    await transporter.sendMail({
      from: acc.email,
      to,
      subject,
      text: body,
      html: `<pre>${body}</pre>`,
    });

    await prisma.mailLog.create({
      data: {
        mailAccountId: acc.id,
        type: "outgoing",
        to,
        from: acc.email,
        subject,
        body,
        status: "sent",
      },
    });
  },
  { connection }
);

console.log("📨 SMTP Worker running...");
