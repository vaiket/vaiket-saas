import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

/**
 * 🔹 Mailcow API helper
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
     * 1️⃣ Verify tenant exists
     */
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Invalid tenant" },
        { status: 401 }
      );
    }

    /**
     * 2️⃣ Domain from onboarding (TENANT-WISE)
     */
    const onboarding = await prisma.onboarding.findFirst({
      where: { tenantId },
    });

    if (!onboarding?.website) {
      return NextResponse.json(
        { success: false, message: "Domain not configured" },
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
     * 3️⃣ Check existing mailbox (tenant-safe)
     */
    const existing = await prisma.tenantMailbox.findFirst({
      where: { tenantId, email },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Mailbox already exists",
        mailboxId: existing.id,
      });
    }

    /**
     * 4️⃣ Ensure domain exists in Mailcow
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
     * 5️⃣ Create mailbox in Mailcow
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
     * 6️⃣ Save mailbox in DB
     */
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
        smtpSecure: false,
      },
    });

    /**
     * 7️⃣ Create DNS records (FINAL & CORRECT)
     */
    await prisma.mailboxDNS.create({
      data: {
        tenantId,
        mailboxId: mailbox.id,
        domain,

        // ✅ SPF (IP based – confirmed)
        spfHost: "@",
        spfValue: "v=spf1 ip4:51.91.157.95 ~all",
        spfStatus: "pending",

        // ✅ DKIM (real key will be fetched on verify)
        dkimHost: "default._domainkey",
        dkimValue: "PENDING_DKIM",
        dkimStatus: "pending",

        // ✅ DMARC (standard)
        dmarcHost: "_dmarc",
        dmarcValue: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
        dmarcStatus: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mailbox created successfully",
      mailboxId: mailbox.id,
    });
  } catch (error: any) {
    console.error("MAIL CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Mailbox creation failed",
      },
      { status: 500 }
    );
  }
}
