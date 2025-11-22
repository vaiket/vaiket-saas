// src/lib/runImap.ts
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";

/**
 * Run IMAP sync for a single tenant.
 * - finds active mail accounts for tenant
 * - connects to each IMAP account, fetches unseen messages, inserts into IncomingEmail table (prevents duplicates)
 */
export async function runImapSync(tenantId: number) {
  const accounts = await prisma.mailAccount.findMany({
    where: { tenantId, active: true, imapHost: { not: null } },
  });

  let totalInserted = 0;

  for (const acc of accounts) {
    // skip if any required IMAP field missing
    if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) continue;

    const client = new ImapFlow({
      host: acc.imapHost,
      port: acc.imapPort,
      secure: !!acc.imapSecure,
      tlsOptions: { rejectUnauthorized: false },
      auth: { user: acc.imapUser, pass: acc.imapPass },
      // connectionTimeout, socketTimeout can be configured if needed
    });

    try {
      await client.connect();
      await client.mailboxOpen("INBOX");

      // fetch unseen messages
      for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true })) {
        const parsed = await simpleParser(msg.source);

        const messageId = parsed.messageId || parsed.headers.get("message-id") || `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const fromText = parsed.from?.text || parsed.headers.get("from")?.toString() || "";
        const toText = parsed.to?.text || parsed.headers.get("to")?.toString() || "";

        // Check duplicate within this tenant using messageId or subject+date fallback
        const exists = await prisma.incomingEmail.findFirst({
          where: {
            tenantId,
            OR: [
              { messageId },
              { raw: { contains: messageId } } // fallback
            ]
          },
        });
        if (exists) continue;

        await prisma.incomingEmail.create({
          data: {
            tenantId,
            mailAccountId: acc.id,
            from: fromText,
            to: toText,
            subject: parsed.subject || "(no subject)",
            body: parsed.text || parsed.html || "",
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
      try { await client.logout(); } catch (e) { /* ignore */ }
    }
  }

  return { ok: true, inserted: totalInserted };
}
