import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

/**
 * Mailcow API helper
 */
async function mailcowFetch(
  path: string,
  method: "GET" | "POST",
  body?: any
) {
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
    throw new Error(data?.msg || text || "Mailcow error");
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username & password required" },
        { status: 400 }
      );
    }

    /* 🔹 Logged-in user */
    const user = await prisma.user.findFirst({
      where: { id: (req as any).user?.id },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      throw new Error("Tenant not found");
    }

    const tenantId = user.tenantId;

    /* 🔹 Domain from onboarding */
    const onboarding = await prisma.onboarding.findFirst({
      where: { tenantId },
      select: { website: true },
    });

    if (!onboarding?.website) {
      throw new Error("Domain not configured");
    }

    const domain = onboarding.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");

    const email = `${username}@${domain}`;

    /* 🔹 Check existing mailbox */
    const existing = await prisma.tenantMailbox.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        mailboxId: existing.id,
      });
    }

    /* 🔹 Create mailbox in Mailcow */
    await mailcowFetch("/add/mailbox", "POST", {
      local_part: username,
      domain,
      password,
      password2: password,
      quota: "1024",
      active: "1",
    });

    /* 🔹 Save TenantMailbox (matches DB exactly) */
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
        imapSecure: true,

        smtpHost: `mail.${domain}`,
        smtpPort: 587,
        smtpSecure: true,
      },
    });

    /* 🔹 Create DNS records (AUTO) */
    await prisma.mailboxDNS.create({
      data: {
        tenantId,
        mailboxId: mailbox.id,
        domain,

        spfHost: "@",
        spfValue: `v=spf1 ip4:${process.env.MAIL_SERVER_IP} ~all`,

        dkimHost: "dkim._domainkey",
        dkimValue: "v=DKIM1; k=rsa; p=TEMP_KEY",

        dmarcHost: "_dmarc",
        dmarcValue: "v=DMARC1; p=none",
      },
    });

    return NextResponse.json({
      success: true,
      mailboxId: mailbox.id,
    });
  } catch (err: any) {
    console.error("MAIL CREATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Mailbox creation failed",
      },
      { status: 500 }
    );
  }
}
