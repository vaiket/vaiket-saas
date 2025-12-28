// src/lib/runImap.ts
import { ImapFlow } from "imapflow";
import { simpleParser, AddressObject } from "mailparser";
import { prisma } from "@/lib/prisma";

// ✅ Safely extract emails from AddressObject | AddressObject[]
function extractEmails(input: AddressObject | AddressObject[] | undefined): string {
  if (!input) return "";

  if (Array.isArray(input)) {
    return input
      .flatMap(obj => obj.value?.map(v => v.address ?? "") ?? [])
      .filter(Boolean)
      .join(",");
  }

  return (
    input.value?.map(v => v.address ?? "").filter(Boolean).join(",") ||
    input.text ||
    ""
  );
}

// ✅ Normalize message-id so Prisma always gets a string
function normalizeMessageId(input: any): string {
  if (!input) return "";
  if (Array.isArray(input)) return input[0] ?? "";
  if (Buffer.isBuffer(input)) return input.toString("utf8");
  return String(input);
}

export async function runImapSync(tenantId: number) {
  const accounts = await prisma.mailAccount.findMany({
    where: { tenantId, active: true, imapHost: { not: null } },
  });

  let totalInserted = 0;

  for (const acc of accounts) {
    if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) continue;

    const client = new ImapFlow({
      host: acc.imapHost,
      port: acc.imapPort,
      secure: !!acc.imapSecure,
      tls: { rejectUnauthorized: false },
      auth: {
        user: acc.imapUser,
        pass: acc.imapPass,
      },
    });

    try {
      await client.connect();
      await client.mailboxOpen("INBOX");

      for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
        const parsed = await simpleParser(msg.source);

        const rawHeaderId = parsed.messageId || parsed.headers.get("message-id");
        const messageId =
          normalizeMessageId(rawHeaderId) ||
          `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const fromText = extractEmails(parsed.from);
        const toText = extractEmails(parsed.to);

        // ✅ now TypeScript + Prisma safe
        const exists = await prisma.incomingEmail.findFirst({
          where: { tenantId, messageId },
        });

        if (exists) continue;

        await prisma.incomingEmail.create({
          data: {
            tenantId,
            mailAccountId: acc.id,
            from: fromText,
            to: toText,
            subject: parsed.subject || "(no subject)",
            body: parsed.text || "",
            html: parsed.html || null,
            raw: parsed.textAsHtml || parsed.text || null,
            messageId,
            processed: false,
          },
        });

        totalInserted++;
      }
    } catch (err) {
      console.error(`IMAP sync error for account ${acc.email}:`, err);
    } finally {
      try {
        await client.logout();
      } catch (_) {}
    }
  }

  return { ok: true, inserted: totalInserted };
}
