import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Imap from "imap";
import { simpleParser } from "mailparser";

export async function GET() {
  try {
    const accounts = await prisma.mailAccount.findMany();

    if (!accounts.length)
      return NextResponse.json({ success: false, message: "No accounts found" });

    for (const acc of accounts) {
      runImapForAccount(acc);
    }

    return NextResponse.json({
      success: true,
      message: "IMAP Sync started for all accounts",
    });

  } catch (err) {
    console.error("IMAP Sync Error:", err);
    return NextResponse.json({ success: false, error: "IMAP sync failed" });
  }
}

function runImapForAccount(account: any) {
  const imap = new Imap({
    user: account.imapUser,
    password: account.imapPass,
    host: account.imapHost,
    port: account.imapPort,
    tls: true,
  });

  imap.once("ready", () => {
    imap.openBox("INBOX", false, (err, box) => {
      if (err) throw err;

      imap.search(["UNSEEN"], (err, results) => {
        if (err || !results || results.length === 0) {
          console.log(`No new emails for: ${account.email}`);
          imap.end();
          return;
        }

        const f = imap.fetch(results, { bodies: "" });

        f.on("message", (msg) => {
          let raw = "";

          msg.on("body", (stream) => {
            stream.on("data", (chunk) => (raw += chunk.toString("utf8")));
          });

          msg.on("end", async () => {
            const parsed = await simpleParser(raw);

            await prisma.incomingEmail.create({
              data: {
                mailAccountId: account.id,
                from: parsed.from?.text || "",
                to: parsed.to?.text || "",
                subject: parsed.subject || "",
                body: parsed.text || "",
                raw,
              },
            });

            console.log("📥 Saved email for:", account.email);
          });
        });

        f.once("end", () => {
          console.log(`Done fetching unseen for: ${account.email}`);
          imap.end();
        });
      });
    });
  });

  imap.once("error", (err) => {
    console.log("IMAP error for", account.email, err);
  });

  imap.connect();
}
