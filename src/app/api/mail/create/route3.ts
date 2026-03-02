import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

async function mailcowFetch(path: string, method: "GET" | "POST", body?: any) {
  const res = await fetch(`${process.env.MAILCOW_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.MAILCOW_API_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.msg || text);
  return data;
}

export async function POST(req: Request) {
  try {
    const { tenantId, username, password } = await req.json();
    if (!tenantId || !username || !password) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 🔹 Get domain from onboarding
    const onboarding = await prisma.onboarding.findFirst({ where: { tenantId } });
    if (!onboarding?.website) throw new Error("Domain missing");

    const domain = onboarding.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");

    const email = `${username}@${domain}`;

    // 🔹 Find or create mailbox
    let mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId, email },
    });

    if (!mailbox) {
      await mailcowFetch("/add/mailbox", "POST", {
        local_part: username,
        domain,
        password,
        password2: password,
        quota: "1024",
        active: "1",
      });

      mailbox = await prisma.tenantMailbox.create({
        data: {
          tenantId,
          email,
          username,
          domain,
          mailcowId: email,
          quotaMB: 1024,
          active: true,
          imapHost: `mail.${domain}`,
          imapPort: 993,
          imapSecure: true,
          smtpHost: `mail.${domain}`,
          smtpPort: 587,
          smtpSecure: false,
        },
      });
    }

    // 🔥 DNS RECORD — ALWAYS ENSURE
    const dnsExists = await prisma.mailboxDNS.findFirst({
      where: { mailboxId: mailbox.id },
    });

    if (!dnsExists) {
      await prisma.mailboxDNS.create({
        data: {
          tenantId,
          mailboxId: mailbox.id,
          domain,
          spfHost: "@",
          spfValue: `v=spf1 ip4:${process.env.MAIL_SERVER_IP} ~all`,
          dkimHost: "dkim._domainkey",
          dkimValue: "v=DKIM1; k=rsa; p=TEMPKEY",
          dmarcHost: "_dmarc",
          dmarcValue: "v=DMARC1; p=none",
        },
      });
    }

    return NextResponse.json({
      success: true,
      mailboxId: mailbox.id,
    });
  } catch (e: any) {
    console.error("MAIL CREATE ERROR:", e);
    return NextResponse.json(
      { success: false, message: e.message },
      { status: 500 }
    );
  }
}
