// src/workers/smtp-worker.ts
import { Worker, QueueScheduler } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const REDIS_URL = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);
if (!REDIS_URL) {
  console.error("No REDIS_URL configured — worker will not run.");
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// Create scheduler (recommended)
new QueueScheduler("smtp-send", { connection });

const worker = new Worker(
  "smtp-send",
  async (job) => {
    const { tenantId, credsId, payload } = job.data;
    // fetch fresh creds from DB
    const creds = await prisma.smtpCredentials.findUnique({ where: { id: credsId } });
    if (!creds) throw new Error("SMTP creds not found for job");

    const transporter = nodemailer.createTransport({
      host: creds.host!,
      port: Number(creds.port),
      secure: Number(creds.port) === 465,
      auth: {
        user: creds.username!,
        pass: creds.password!,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();
    const info = await transporter.sendMail(payload);
    console.log("SMTP worker: sent", payload.to, info.messageId);
    return info;
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log("Job completed:", job.id);
});
worker.on("failed", (job, err) => {
  console.error("Job failed:", job?.id, err);
});

console.log("SMTP Worker started");
