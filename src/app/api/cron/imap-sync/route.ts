// src/app/api/cron/imap-sync/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export async function POST() {
  try {
    // Get all active mail accounts for all tenants
    const accounts = await prisma.mailAccount.findMany({
      where: { active: true },
    });

    let totalInserted = 0;

    for (const acc of accounts) {
      if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) {
        continue;
      }

      const client = new ImapFlow({
        host: acc.imapHost,
        port: acc.imapPort,
        secure: true,
        tlsOptions: { rejectUnauthorized: false },
        auth: {
          user: acc.imapUser,
          pass: acc.imapPass,
        },
      });

      await client.connect();
      await client.mailboxOpen("INBOX");

      const lock = await client.getMailboxLock("INBOX");
      try {
        for await (const msg of client.fetch({ seen: false }, { source: true })) {
          const parsed = await simpleParser(msg.source);

          const messageId = parsed.messageId || `msg-${Date.now()}`;

          const exists = await prisma.incomingEmail.findFirst({
            where: {
              tenantId: acc.tenantId,
              messageId,
            },
          });

          if (exists) continue;

          await prisma.incomingEmail.create({
            data: {
              tenantId: acc.tenantId,
              mailAccountId: acc.id,

              from: parsed.from?.text || "",
              to: parsed.to?.text || "",
              subject: parsed.subject || "",
              body: parsed.text || "",
              html: parsed.html || "",
              raw: parsed.textAsHtml || "",
              messageId,
            },
          });

          totalInserted++;
        }
      } finally {
        lock.release();
      }

      await client.logout();
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      message: "IMAP sync run complete",
    });
  } catch (err: any) {
    console.error("CRON IMAP ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
