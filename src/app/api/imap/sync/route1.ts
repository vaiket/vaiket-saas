import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });
    }

    // find mail account + tenant check
    const acc = await prisma.mailAccount.findUnique({ where: { id: accountId } });

    if (!acc || acc.tenantId !== token.tenantId) {
      return NextResponse.json({ success: false, error: "Account not found for this tenant" }, { status: 404 });
    }

    // IMAP required fields
    if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) {
      return NextResponse.json({ success: false, error: "IMAP missing fields" }, { status: 400 });
    }

    // IMAP connection
    const client = new ImapFlow({
      host: acc.imapHost,
      port: acc.imapPort,
      secure: true,
      tlsOptions: { rejectUnauthorized: false },
      auth: {
        user: acc.imapUser,
        pass: acc.imapPass
      }
    });

    await client.connect();
    await client.mailboxOpen("INBOX");
    const lock = await client.getMailboxLock("INBOX");

    let inserted = 0;

    try {
      for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
        const parsed = await simpleParser(msg.source);

        const messageId = parsed.messageId || parsed.subject || `msg-${Date.now()}`;

        // PREVENT DUPLICATE FOR SAME TENANT
        const exists = await prisma.incomingEmail.findFirst({
          where: {
            messageId,
            tenantId: acc.tenantId,  // 🔥 only check within same tenant
          },
        });

        if (exists) continue;

        // 🔥 MULTI-TENANT FIX: tenantId ADD!!!
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
            messageId
          }
        });

        inserted++;
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      inserted,
      message: "Sync completed successfully"
    });

  } catch (err: any) {
    console.error("IMAP SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
