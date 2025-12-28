import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    // 🔐 Auth
    const token = getTokenData(req);
    if (!token?.tenantId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mailboxId = searchParams.get("mailboxId");

    if (!mailboxId) {
      return NextResponse.json(
        { success: false, message: "mailboxId is required" },
        { status: 400 }
      );
    }

    // 🔥 Fetch DNS records (tenant + mailbox safe)
    const dnsRecords = await prisma.mailboxDNS.findMany({
      where: {
        tenantId: token.tenantId,
        mailboxId: Number(mailboxId),
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      dns: dnsRecords,
    });
  } catch (error) {
    console.error("DNS FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load DNS records" },
      { status: 500 }
    );
  }
}
