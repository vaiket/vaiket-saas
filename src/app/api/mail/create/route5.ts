import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

/* ================= MAILCOW HELPER ================= */
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
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      typeof data === "string" ? data : data?.msg || "Mailcow error"
    );
  }

  return data;
}

/* ================= POST /api/mail/create ================= */
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username & password required" },
        { status: 400 }
      );
    }

    /* 🔐 Logged-in user (middleware se inject hota hai) */
    const authUser = (req as any).user;
    if (!authUser?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { tenantId: true },
    });

    if (!user?.tenantId) throw new Error("Tenant not found");

    const tenantId = user.tenantId;

    /* 🌐 Domain strictly from onboarding (tenant-wise) */
    const onboarding = await prisma.onboarding.findFirst({
      where: { tenantId },
      select: { website: true },
    });

    if (!onboarding?.website) {
      throw new Error("Domain not configured for this tenant");
    }

    const domain = onboarding.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase();

    const email = `${username}@${domain}`;

    /* 🚫 Prevent duplicate mailbox for same tenant */
    const existingMailbox = await prisma.tenantMailbox.findFirst({
      where: {
        tenantId,
        email,
      },
    });

    if (existingMailbox) {
      return NextResponse.json({
        success: true,
        message: "Mailbox already exists",
        mailboxId: existingMailbox.id,
      });
    }

    /* 📨 Create mailbox in Mailcow FIRST */
    await mailcowFetch("/add/mailbox", "POST", {
      local_part: username,
      domain,
      password,
      password2: password,
      quota: "1024",
      active: "1",
    });

    /* 💾 Save TenantMailbox (DB = source of truth) */
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

    /* 🌐 AUTO DNS RECORDS */
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

    /* ✅ FINAL RESPONSE */
    return NextResponse.json({
      success: true,
      message: "Mailbox created successfully",
      mailbox: {
        id: mailbox.id,
        email: mailbox.email,
        domain: mailbox.domain,
      },
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
