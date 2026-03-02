import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser, AddressObject, EmailAddress } from "mailparser";
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

    const acc = await prisma.mailAccount.findUnique({
      where: { id: accountId }
    });

    if (!acc || acc.tenantId !== token.tenantId) {
      return NextResponse.json({ success: false, error: "Account not found for this tenant" }, { status: 404 });
    }

    if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) {
      return NextResponse.json({ success: false, error: "IMAP missing fields" }, { status: 400 });
    }

    const client = new ImapFlow({
      host: acc.imapHost,
      port: acc.imapPort,
      secure: true, // ✅ no tlsOptions needed
      auth: {
        user: acc.imapUser,
        pass: acc.imapPass
      }
    });

    await client.connect();
    await client.mailboxOpen("INBOX");
    const lock = await client.getMailboxLock("INBOX");

    let inserted = 0;

    // ✅ Helper to clean email addresses safely
    const extract = (
      input: AddressObject | AddressObject[] | undefined
    ): string => {
      if (!input) return "";
      const arr = Array.isArray(input) ? input : [input];

      return arr
        .flatMap(obj =>
          obj.value.map((v: EmailAddress) => v.address ?? "")
        )
        .filter(Boolean)
        .join(",");
    };

    try {
      for await (const msg of client.fetch("1:*", { source: true })) {
        if (!msg.source) continue;

        const parsed = await simpleParser(msg.source);

        const messageId =
          parsed.messageId || `msg-${acc.id}-${Date.now()}-${Math.random()}`;

        const exists = await prisma.incomingEmail.findFirst({
          where: {
            messageId,
            tenantId: acc.tenantId
          }
        });

        if (exists) continue;

        await prisma.incomingEmail.create({
          data: {
            tenantId: acc.tenantId,
            mailAccountId: acc.id,
            from: extract(parsed.from),
            to: extract(parsed.to),
            subject: parsed.subject ?? "",
            body: parsed.text ?? "",
            html: typeof parsed.html === "string" ? parsed.html : "",
            raw: typeof parsed.textAsHtml === "string" ? parsed.textAsHtml : "",
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
      message: "IMAP sync completed successfully ✅"
    });

  } catch (err: any) {
    console.error("IMAP SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
