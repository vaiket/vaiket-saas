import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Missing accountId" },
        { status: 400 }
      );
    }

    const acc = await prisma.mailAccount.findUnique({
      where: { id: accountId },
    });

    // ✅ Multi-tenant security
    if (!acc || acc.tenantId !== token.tenantId) {
      return NextResponse.json(
        { success: false, error: "Account not found for your tenant" },
        { status: 404 }
      );
    }

    // ✅ Ensure IMAP credentials exist
    if (!acc.imapHost || !acc.imapPort || !acc.imapUser || !acc.imapPass) {
      return NextResponse.json(
        { success: false, error: "Missing IMAP details" },
        { status: 400 }
      );
    }

    // ✅ FIX — remove tlsOptions, use tls instead
    const client = new ImapFlow({
      host: acc.imapHost,
      port: acc.imapPort,
      secure: true,
      tls: { rejectUnauthorized: false }, // ✅ correct ImapFlow option
      auth: {
        user: acc.imapUser,
        pass: acc.imapPass,
      },
    });

    await client.connect();
    await client.logout();

    return NextResponse.json({
      success: true,
      message: "IMAP connection successful ✅",
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Test failed" },
      { status: 500 }
    );
  }
}
