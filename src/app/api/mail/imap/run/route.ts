import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ImapFlow } from "imapflow";
import { simpleParser, AddressObject } from "mailparser";

export async function GET() {
  try {
    const accounts = await prisma.mailAccount.findMany({
      where: { active: true },
    });

    if (!accounts.length) {
      return NextResponse.json({
        success: false,
        message: "No active IMAP accounts found",
      });
    }

    let synced = 0;

    for (const acc of accounts) {
      if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) continue;

      const client = new ImapFlow({
        host: acc.imapHost,
        port: Number(acc.imapPort),
        secure: true,
        tls: { rejectUnauthorized: false },
        auth: {
          user: acc.imapUser,
          pass: acc.imapPass,
        },
      });

      await client.connect();
      await client.mailboxOpen("INBOX");

      const lock = await client.getMailboxLock("INBOX");

      try {
        for await (const msg of client.fetch("1:*", { source: true })) {
          if (!msg.source) continue;

          const parsed = await simpleParser(msg.source);

          const messageId =
            parsed.messageId || `${acc.id}-${msg.uid}-${Date.now()}`;

          // prevent duplicates
          const exists = await prisma.incomingEmail.findFirst({
            where: {
              mailAccountId: acc.id,
              messageId,
            },
          });
          if (exists) continue;

          // ✅ Safe FROM extraction
          const from = Array.isArray(parsed.from)
            ? parsed.from
                .flatMap((f: AddressObject) =>
                  f?.value?.map(v => v.address ?? "") ?? []
                )
                .filter(Boolean)
                .join(",")
            : parsed.from?.value
            ? parsed.from.value
                .map(v => v.address ?? "")
                .filter(Boolean)
                .join(",")
            : parsed.from?.text ?? "";

          // ✅ Safe TO extraction
          const to = Array.isArray(parsed.to)
            ? parsed.to
                .flatMap((f: AddressObject) =>
                  f?.value?.map(v => v.address ?? "") ?? []
                )
                .filter(Boolean)
                .join(",")
            : parsed.to?.value
            ? parsed.to.value
                .map(v => v.address ?? "")
                .filter(Boolean)
                .join(",")
            : parsed.to?.text ?? "";

          await prisma.incomingEmail.create({
            data: {
              tenantId: acc.tenantId,
              mailAccountId: acc.id,
              from,
              to,
              subject: parsed.subject ?? "",
              body: parsed.text ?? "",
              html: typeof parsed.html === "string" ? parsed.html : "",
              raw: parsed.textAsHtml ?? "",
              messageId,
            },
          });

          synced++;
        }
      } finally {
        lock.release();
      }

      await client.logout();
    }

    return NextResponse.json({
      success: true,
      synced,
      message: "✅ IMAP sync completed",
    });
  } catch (err: any) {
    console.error("IMAP RUN ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
