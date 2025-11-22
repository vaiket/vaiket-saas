import "dotenv/config";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import pLimit from "p-limit";
import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONCURRENCY = Number(process.env.IMAP_CONCURRENCY || 4);
const FETCH_LIMIT = Number(process.env.IMAP_FETCH_LIMIT || 50);
const POLL_INTERVAL_SECONDS = Number(process.env.IMAP_POLL_INTERVAL || 60);

console.log("🟢 IMAP SYNC WORKER STARTED");

function makeImapConfig(account) {
  const secure = account.imapSecure === true; // <-- FIXED

  console.log(
    `🔧 IMAP CONFIG → host=${account.imapHost} port=${account.imapPort} SSL=${secure}`
  );

  return {
    imap: {
      user: account.imapUser,
      password: account.imapPass,
      host: account.imapHost,
      port: Number(account.imapPort),
      tls: secure,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 20000,
    },
  };
}

async function processAccount(account) {
  const label = `${account.email} (#${account.id})`;
  console.log(`\n🔁 Checking: ${label}`);

  let connection = null;

  try {
    const config = makeImapConfig(account);
    connection = await imaps.connect(config);

    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    if (!messages.length) {
      console.log(`📭 No new mail for ${label}`);
      await connection.end();
      return;
    }

    const slice = messages.slice(0, FETCH_LIMIT);

    for (const msg of slice) {
      try {
        const bodyPart = msg.parts.find((p) => p.which === "TEXT");
        const headerPart = msg.parts.find((p) => p.which === "HEADER");

        const raw = bodyPart?.body || "";
        const header = headerPart?.body || {};

        const parsed = await simpleParser(raw);

        await prisma.incomingEmail.create({
          data: {
            mailAccountId: account.id,
            from: parsed.from?.text || header.from || "",
            to: parsed.to?.text || header.to || "",
            subject: parsed.subject || header.subject || "",
            body: parsed.text || "",
            html: parsed.html || "",
            raw,
            createdAt: new Date(),
          },
        });

        console.log(`📩 Saved email: ${parsed.subject}`);
      } catch (err) {
        console.error("❌ Parse error:", err.message);
      }
    }

    await connection.end();
    console.log(`✅ Finished: ${label}`);
  } catch (err) {
    console.log("❌ IMAP LOGIN FAILED:", err.message);
    console.log("🔎 TIP → Check password, SSL, hosting IMAP port.");
    if (connection) {
      try {
        await connection.end();
      } catch {}
    }
  }
}

async function runOnce() {
  console.log("\n======= IMAP RUN START =======");

  const accounts = await prisma.mailAccount.findMany({
    where: { active: true },
  });

  if (!accounts.length) {
    console.log("⚠️ No active email accounts.");
    return;
  }

  const limit = pLimit(CONCURRENCY);

  await Promise.all(
    accounts.map((acc) =>
      limit(async () => await processAccount(acc))
    )
  );

  console.log("======= IMAP RUN DONE =======");
}

async function loopForever() {
  await runOnce();
  setTimeout(loopForever, POLL_INTERVAL_SECONDS * 1000);
}

// Alive heartbeat for dashboard worker monitor
setInterval(() => {
  globalThis.imap_worker_alive = true;
}, 5000);

loopForever();




