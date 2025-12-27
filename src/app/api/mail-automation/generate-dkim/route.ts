import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { mailboxId } = await req.json();

    if (!mailboxId) {
      return NextResponse.json(
        { success: false, message: "mailboxId required" },
        { status: 400 }
      );
    }

    // ✅ 1. Get mailbox from DB (logged-in user's data)
    const mailbox = await prisma.tenantMailbox.findUnique({
      where: { id: mailboxId },
    });

    if (!mailbox || !mailbox.domain) {
      return NextResponse.json(
        { success: false, message: "Mailbox or domain not found" },
        { status: 404 }
      );
    }

    const domain = mailbox.domain; // ✅ REAL DOMAIN

    // ✅ 2. Fetch DKIM from Mailcow
    const res = await fetch(
      `${process.env.MAILCOW_BASE_URL}/get/dkim/${domain}`,
      {
        headers: {
          "X-API-Key": process.env.MAILCOW_API_KEY!,
        },
      }
    );

    const data = await res.json();

    if (!data?.dkim_txt) {
      return NextResponse.json(
        { success: false, message: "DKIM not available yet" },
        { status: 400 }
      );
    }

    // ✅ 3. Save DKIM to SAME mailbox
    await prisma.tenantMailbox.update({
      where: { id: mailboxId },
      data: {
        dkimHost: "default._domainkey",
        dkimValue: data.dkim_txt,
        dkimStatus: "verified",
      },
    });

    return NextResponse.json({
      success: true,
      domain,
      message: "DKIM generated successfully",
    });
  } catch (err: any) {
    console.error("DKIM ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
