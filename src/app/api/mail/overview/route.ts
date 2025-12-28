import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 🔥 TenantMailbox = technical config
    const tenantMailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (!tenantMailbox) {
      return NextResponse.json({
        success: true,
        mailbox: null,
        imapSmtp: null,
        dns: [],
      });
    }

    // 🔥 DNS records
    const dns = await prisma.mailboxDNS.findMany({
      where: { mailboxId: tenantMailbox.id },
      orderBy: { id: "asc" },
    });

    // ✅ FINAL RESPONSE (this is the key fix)
    return NextResponse.json({
      success: true,

      // 👇 For MailboxOverview
      mailbox: {
        email: tenantMailbox.email,
        status: tenantMailbox.active ? "active" : "inactive",
        createdAt: tenantMailbox.createdAt,
      },

      // 👇 For ImapSmtpCard
      imapSmtp: {
        email: tenantMailbox.email,
        imapHost: tenantMailbox.imapHost,
        imapPort: tenantMailbox.imapPort,
        imapSecure: tenantMailbox.imapSecure,
        smtpHost: tenantMailbox.smtpHost,
        smtpPort: tenantMailbox.smtpPort,
        smtpSecure: tenantMailbox.smtpSecure,
        active: tenantMailbox.active,
      },

      dns,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
