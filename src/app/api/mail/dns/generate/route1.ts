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

  if (!res.ok) {
    throw new Error(data?.msg || text);
  }
  return data;
}

export async function POST(req: Request) {
  try {
    const { tenantId, username, password } = await req.json();

    if (!tenantId || !username || !password) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 1️⃣ check existing mailbox
    const existing = await prisma.tenantMailbox.findFirst({ where: { tenantId } });

    if (existing) {
      return NextResponse.json({
        success: true,
        mailboxId: existing.id,
      });
    }

    // 2️⃣ domain
    const onboarding = await prisma.onboarding.findFirst({ where: { tenantId } });
    if (!onboarding?.website) throw new Error("Domain missing");

    const domain = onboarding.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");

    const email = `${username}@${domain}`;

    // 3️⃣ mailcow create
    await mailcowFetch("/add/mailbox", "POST", {
      local_part: username,
      domain,
      password,
      password2: password,
      quota: "1024",
      active: "1",
    });

    // 4️⃣ save mailbox
    const mailbox = await prisma.tenantMailbox.create({
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
        smtpHost: `mail.${domain}`,
        smtpPort: 587,
      },
    });

    // 🔥🔥🔥 5️⃣ DNS GENERATE (HERE – GUARANTEED)
    await prisma.mailbox_dns.create({
      data: {
        tenant_id: tenantId,
        mailbox_id: mailbox.id,
        domain: mailbox.domain,
        spf_host: "@",
        spf_value: `v=spf1 ip4:${process.env.MAIL_SERVER_IP} ~all`,
        dkim_host: "dkim._domainkey",
        dkim_value: "v=DKIM1; k=rsa; p=TEMPKEY",
        dmarc_host: "_dmarc",
        dmarc_value: `v=DMARC1; p=none`,
      },
    });

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
