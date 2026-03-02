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
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      typeof data === "string"
        ? data
        : data?.msg || JSON.stringify(data)
    );
  }

  return data;
}

/**
 * POST /api/mail/create
 */
export async function POST(req: Request) {
  try {
    const { tenantId, username, password } = await req.json();

    if (!tenantId || !username || !password) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    /**
     * 1️⃣ Check if mailbox already exists (tenant-safe)
     */
    const existingMailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId },
    });

    if (existingMailbox) {
      return NextResponse.json({
        success: true,
        message: "Mailbox already exists",
        mailbox: {
          id: existingMailbox.id,          // 🔥 REQUIRED
          tenantId: existingMailbox.tenantId,
          email: existingMailbox.email,
          domain: existingMailbox.domain,
        },
      });
    }

    /**
     * 2️⃣ Get domain from onboarding
     */
    const onboarding = await prisma.onboarding.findFirst({
      where: { tenantId },
    });

    if (!onboarding?.website) {
      return NextResponse.json(
        { success: false, message: "Domain not found for tenant" },
        { status: 400 }
      );
    }

    const domain = onboarding.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase();

    const email = `${username}@${domain}`;

    /**
     * 3️⃣ Ensure domain exists in Mailcow (idempotent)
     */
    const domains = await mailcowFetch("/get/domain/all", "GET");

    const domainExists =
      Array.isArray(domains) &&
      domains.some((d: any) => d.domain_name === domain);

    if (!domainExists) {
      await mailcowFetch("/add/domain", "POST", {
        domain,
        description: `Tenant domain ${domain}`,
        active: "1",
        aliases: "10",
        mailboxes: "10",
        defquota: "1024",
        maxquota: "2048",
      });
    }

    /**
     * 4️⃣ Create mailbox in Mailcow
     * ❗ If this fails → NOTHING is saved in DB
     */
    await mailcowFetch("/add/mailbox", "POST", {
      local_part: username,
      domain,
      name: username,
      password,
      password2: password,
      quota: "1024",
      active: "1",
    });

    /**
     * 5️⃣ Save mailbox in DB (after Mailcow success)
     */
    const mailbox = await prisma.tenantMailbox.create({
      data: {
        tenantId,
        email,
        username,
        domain,

        // Stable identifier
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

    /**
     * 6️⃣ Final response (🔥 mailbox.id INCLUDED)
     */
    return NextResponse.json({
      success: true,
      message: "Mailbox created successfully",
      mailbox: {
        id: mailbox.id,                // 🔥 REQUIRED
        tenantId: mailbox.tenantId,
        email: mailbox.email,
        domain: mailbox.domain,

        imap: {
          host: mailbox.imapHost,
          port: mailbox.imapPort,
          secure: mailbox.imapSecure,
        },
        smtp: {
          host: mailbox.smtpHost,
          port: mailbox.smtpPort,
          secure: mailbox.smtpSecure,
        },
      },
    });
  } catch (error: any) {
    console.error("MAIL CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to create mailbox. Please contact support.",
      },
      { status: 500 }
    );
  }
}
