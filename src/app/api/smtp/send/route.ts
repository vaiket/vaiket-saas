// src/app/api/smtp/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";
import nodemailer from "nodemailer";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

function getQueue() {
  if (!REDIS_URL) return null;
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return new Queue("smtp-send", { connection });
}

async function doSend(creds: any, payload: any) {
  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: Number(creds.port),
    secure: Number(creds.port) === 465,
    auth: {
      user: creds.username,
      pass: creds.password,
    },
    tls: { rejectUnauthorized: false },
  });

  await transporter.verify();
  return transporter.sendMail(payload);
}

export async function POST(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { to, subject, text, html, from } = body;
    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ success: false, error: "Missing fields (to/subject/body)" }, { status: 400 });
    }

    const creds = await prisma.smtpCredentials.findUnique({ where: { tenantId: token.tenantId } });
    if (!creds) return NextResponse.json({ success: false, error: "SMTP credentials not found for tenant" }, { status: 404 });

    const payload = {
      from: from || process.env.DEFAULT_FROM || creds.username,
      to,
      subject,
      text,
      html,
    };

    // If Redis/Queue available, enqueue for worker
    const queue = getQueue();
    if (queue) {
      await queue.add("send", { tenantId: token.tenantId, credsId: creds.id, payload }, { removeOnComplete: true, removeOnFail: false });
      return NextResponse.json({ success: true, queued: true });
    }

    // Fallback — immediate send (synchronous)
    const info = await doSend(creds, payload);
    return NextResponse.json({ success: true, queued: false, info });
  } catch (err: any) {
    console.error("SMTP send error:", err);
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}
