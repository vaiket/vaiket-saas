import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

/**
 * GET /api/mail/dns?mailboxId=1
 * Returns DNS records for a mailbox
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mailboxIdParam = searchParams.get("mailboxId");

    if (!mailboxIdParam) {
      return NextResponse.json(
        { success: false, message: "mailboxId is required" },
        { status: 400 }
      );
    }

    const mailboxId = Number(mailboxIdParam);

    if (Number.isNaN(mailboxId)) {
      return NextResponse.json(
        { success: false, message: "Invalid mailboxId" },
        { status: 400 }
      );
    }

    /* 🔹 Ensure mailbox exists */
    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: mailboxId },
      select: {
        id: true,
        email: true,
        domain: true,
      },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, message: "Mailbox not found" },
        { status: 404 }
      );
    }

    /* 🔹 Fetch DNS records */
    const dns = await prisma.mailboxDNS.findFirst({
      where: { mailboxId },
      orderBy: { createdAt: "desc" },
    });

    if (!dns) {
      return NextResponse.json(
        {
          success: false,
          message: "DNS records not generated yet",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      mailbox: {
        email: mailbox.email,
        domain: mailbox.domain,
      },
      dns: {
        spf: {
          host: dns.spfHost,
          value: dns.spfValue,
          status: dns.spfStatus,
        },
        dkim: {
          host: dns.dkimHost,
          value: dns.dkimValue,
          status: dns.dkimStatus,
        },
        dmarc: {
          host: dns.dmarcHost,
          value: dns.dmarcValue,
          status: dns.dmarcStatus,
        },
        createdAt: dns.createdAt,
        updatedAt: dns.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("DNS GET ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch DNS records",
      },
      { status: 500 }
    );
  }
}
