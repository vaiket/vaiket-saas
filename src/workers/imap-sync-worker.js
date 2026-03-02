const { Worker } = require("bullmq");
const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");

const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");

console.log("🚀 IMAP Worker Started (CommonJS Mode)");

module.exports = new Worker(
  "imap-sync",
  async () => {
    console.log("⏳ Running IMAP Auto-Sync...");

    const accounts = await prisma.mailAccount.findMany({
      where: { active: true },
    });

    for (const acc of accounts) {
      try {
        console.log("Syncing:", acc.email);

        const client = new ImapFlow({
          host: acc.imapHost,
          port: acc.imapPort,
          secure: true,
          tls: { rejectUnauthorized: false },
          auth: {
            user: acc.imapUser,
            pass: acc.imapPass,
          },
        });

        await client.connect();
        await client.mailboxOpen("INBOX");

        for await (let msg of client.fetch({ seen: false }, { source: true })) {
          const parsed = await simpleParser(msg.source);

          const fromText = Array.isArray(parsed.from)
            ? parsed.from.map((a) => a.text).join(", ")
            : parsed.from?.text || "";

          const toText = Array.isArray(parsed.to)
            ? parsed.to.map((a) => a.text).join(", ")
            : parsed.to?.text || "";

          await prisma.incomingEmail.create({
            data: {
              tenantId: acc.tenantId,
              mailAccountId: acc.id,
              from: fromText,
              to: toText,
              subject: parsed.subject || "",
              body: parsed.text || "",
              html: parsed.html || "",
              raw: parsed.textAsHtml || "",
              messageId:
                parsed.messageId || parsed.subject || Date.now().toString(),
            },
          });
        }

        await client.logout();
        console.log("✔ Synced:", acc.email);
      } catch (err) {
        console.error("❌ Sync error for", acc.email, err);
      }
    }

    console.log("🔥 IMAP Auto-Sync Completed");
  },
  { connection: redis }
);
