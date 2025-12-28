export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";
import { encrypt } from "@/lib/crypto";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    /* ---------------- AUTH ---------------- */
    const token = getTokenData(req);
    if (!token?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 400 }
      );
    }

    /* ---------------- INPUT ---------------- */
    const { tenantMailboxId, password } = await req.json();

    if (!tenantMailboxId || !password) {
      return NextResponse.json(
        { success: false, message: "Missing mailbox or password" },
        { status: 400 }
      );
    }

    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: tenantMailboxId },
    });

    if (!mailbox || mailbox.tenantId !== user.tenantId) {
      return NextResponse.json(
        { success: false, message: "Mailbox not found" },
        { status: 404 }
      );
    }

    /* ---------------- IMAP VERIFY ---------------- */
    const imap = new ImapFlow({
      host: mailbox.imapHost,
      port: mailbox.imapPort,
      secure: mailbox.imapSecure,
      auth: {
        user: mailbox.email,
        pass: password,
      },
      socketTimeout: 15000,
      greetingTimeout: 15000,
      authTimeout: 15000,
      tls: {
        rejectUnauthorized: false, // Mailcow / self-signed safe
      },
    });

    try {
      await imap.connect();
    } catch (err: any) {
      console.error("IMAP VERIFY ERROR:", err?.message);
      return NextResponse.json(
        {
          success: false,
          imap: false,
          message: "IMAP authentication failed",
        },
        { status: 401 }
      );
    } finally {
      if (imap.usable) {
        try {
          await imap.logout();
        } catch {}
      }
    }

    /* ---------------- SMTP VERIFY ---------------- */
    const smtpPort = mailbox.smtpPort || 587;
    const smtpSecure = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: mailbox.smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: mailbox.email,
        pass: password,
      },
      requireTLS: true,
      connectionTimeout: 15000,
      tls: {
        rejectUnauthorized: false, // Mailcow / VPS safe
      },
    });

    try {
      await transporter.verify(); // 🔥 AUTH ONLY (NO MAIL SEND)
    } catch (err: any) {
      console.error("SMTP VERIFY ERROR:", err?.message);
      return NextResponse.json(
        {
          success: false,
          imap: true,
          smtp: false,
          message: "SMTP authentication failed",
        },
        { status: 401 }
      );
    }

    /* ---------------- SAVE PASSWORD ---------------- */
    const encryptedPassword = encrypt(password);

    await prisma.tenantMailboxAutomation.upsert({
      where: {
        tenantMailboxId: mailbox.id,
      },
      update: {
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
      },
      create: {
        tenantMailboxId: mailbox.id,
        tenantId: user.tenantId,
        encryptedPassword,
        automationEnabled: true,
        status: "APPROVED",
      },
    });

    /* ---------------- SUCCESS ---------------- */
    return NextResponse.json({
      success: true,
      imap: true,
      smtp: true,
    });
  } catch (err) {
    console.error("VERIFY MAILBOX FATAL ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
