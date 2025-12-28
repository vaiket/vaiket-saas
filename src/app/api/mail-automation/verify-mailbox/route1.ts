import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Imap from "imap";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const runtime = "nodejs";
const prisma = new PrismaClient();

/* ================= ENCRYPT ================= */
function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const key = crypto
    .createHash("sha256")
    .update(process.env.MAILBOX_ENCRYPTION_KEY!)
    .digest();

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

/* ================= IMAP CHECK ================= */
function verifyImap(config: any) {
  return new Promise<void>((resolve, reject) => {
    const imap = new Imap(config);

    imap.once("ready", () => {
      imap.end();
      resolve();
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
}

/* ================= API ================= */
export async function POST(req: Request) {
  try {
    const { mailboxId, password } = await req.json();

    if (!mailboxId || !password) {
      return NextResponse.json(
        { success: false, message: "Missing mailbox or password" },
        { status: 400 }
      );
    }

    /* 1️⃣ Fetch mailbox */
    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: mailboxId },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, message: "Mailbox not found" },
        { status: 404 }
      );
    }

    /* 2️⃣ IMAP verify */
    await verifyImap({
      user: mailbox.email,
      password,
      host: mailbox.imapHost,
      port: mailbox.imapPort,
      tls: mailbox.imapSecure,
      tlsOptions: { rejectUnauthorized: false },
    });

    /* 3️⃣ SMTP verify */
    const transporter = nodemailer.createTransport({
      host: mailbox.smtpHost,
      port: mailbox.smtpPort,
      secure: mailbox.smtpSecure,
      auth: {
        user: mailbox.email,
        pass: password,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();

    /* 4️⃣ Encrypt password */
    const encryptedPassword = encrypt(password);

    /* 5️⃣ Save / Update Automation */
    await prisma.tenantMailboxAutomation.upsert({
      where: {
        tenantMailboxId: mailbox.id,
      },
      update: {
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
        updatedAt: new Date(),
      },
      create: {
        tenantId: mailbox.tenantId,
        tenantMailboxId: mailbox.id,
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
      },
    });

    return NextResponse.json({
      success: true,
      imap: true,
      smtp: true,
    });
  } catch (err: any) {
    console.error("VERIFY MAILBOX ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message:
          err?.message || "Unable to verify mailbox credentials",
      },
      { status: 400 }
    );
  }
}
