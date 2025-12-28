import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Imap from "imap-simple";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { tenantMailboxId, password } = await req.json();

    if (!tenantMailboxId || !password) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: tenantMailboxId },
    });

    if (!mailbox) {
      return NextResponse.json(
        { error: "Mailbox not found" },
        { status: 404 }
      );
    }

    /* ---------- IMAP VERIFY ---------- */
    let imapResult: "success" | "fail" = "fail";

    try {
      await Imap.connect({
        imap: {
          user: mailbox.email,
          password,
          host: mailbox.imapHost,
          port: mailbox.imapPort,
          tls: mailbox.imapSecure,
          authTimeout: 5000,
        },
      });
      imapResult = "success";
    } catch {
      imapResult = "fail";
    }

    /* ---------- SMTP VERIFY ---------- */
    let smtpResult: "success" | "fail" = "fail";

    try {
      const transporter = nodemailer.createTransport({
        host: mailbox.smtpHost,
        port: mailbox.smtpPort,
        secure: mailbox.smtpSecure,
        auth: {
          user: mailbox.email,
          pass: password,
        },
      });

      await transporter.verify();
      smtpResult = "success";
    } catch {
      smtpResult = "fail";
    }

    return NextResponse.json({
      imap: imapResult,
      smtp: smtpResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
