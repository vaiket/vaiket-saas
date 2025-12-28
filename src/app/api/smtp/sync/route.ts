import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { tenantId } = await req.json();

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "TenantId missing" },
        { status: 400 }
      );
    }

    // 🔹 Get mailbox
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { tenantId, active: true },
    });

    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: "No mailbox found" },
        { status: 404 }
      );
    }

    // ✅ IMPORTANT FIX HERE
    await prisma.smtpCredentials.upsert({
      where: { tenantId },
      update: {
        host: "mail.astramize.com",
        port: mailbox.smtpPort,
        username: mailbox.email, // ✅ FULL EMAIL
      },
      create: {
        tenantId,
        host: "mail.astramize.com",
        port: mailbox.smtpPort,
        username: mailbox.email, // ✅ FULL EMAIL
      },
    });

    return NextResponse.json({
      success: true,
      message: "SMTP synced successfully",
    });
  } catch (err) {
    console.error("SMTP Sync Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
