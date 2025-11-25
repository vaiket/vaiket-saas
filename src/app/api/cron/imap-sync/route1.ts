import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ImapFlow } from "imapflow";
import { simpleParser, AddressObject, EmailAddress } from "mailparser";

export async function POST() {
  try {
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
        secure: true, // ✅ THIS IS ENOUGH
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
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);

          const extract = (
            input: AddressObject | AddressObject[] | undefined
          ): string => {
            if (!input) return "";
            const list = Array.isArray(input) ? input : [input];
            return list
              .flatMap(obj =>
                obj.value.map((v: EmailAddress) => v.address ?? "")
              )
              .filter(Boolean)
              .join(",");
          };

          const from = extract(parsed.from);
          const to = extract(parsed.to);

          const messageId =
            parsed.messageId || `msg-${acc.id}-${Date.now()}-${Math.random()}`;

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
              from,
              to,
              subject: parsed.subject ?? "",
              body: parsed.text ?? "",
              html: typeof parsed.html === "string" ? parsed.html : "",
              raw: typeof parsed.textAsHtml === "string" ? parsed.textAsHtml : "",
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
      message: "IMAP sync completed ✅",
    });
  } catch (err: any) {
    console.error("IMAP SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
