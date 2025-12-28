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

    // 🔥 Get mailbox
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (!mailbox) {
      return NextResponse.json({
        success: true,
        mailbox: null,
        dns: [],
      });
    }

    // 🔥 Get DNS records
    const dns = await prisma.mailboxDNS.findMany({
      where: { mailboxId: mailbox.id },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      mailbox,
      dns,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
