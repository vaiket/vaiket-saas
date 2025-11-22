import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { accountId } = await req.json();
    if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

    // fetch account and ensure it belongs to tenant
    const account = await prisma.mailAccount.findUnique({ where: { id: Number(accountId) } });
    if (!account || account.tenantId !== tokenData.tenantId) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const client = new ImapFlow({
      host: account.imapHost || account.smtpHost || undefined,
      port: account.imapPort || undefined,
      secure: Boolean(account.imapSecure),
      auth: { user: account.imapUser || account.smtpUser, pass: account.imapPass || account.smtpPass },
      // avoid TLS errors on self-signed cpanel certs
      tls: Boolean(account.imapSecure),
      tlsOptions: { rejectUnauthorized: false },
      logger: false,
    });

    try {
      await client.connect();
      await client.logout();
      return NextResponse.json({ success: true, message: "IMAP connection successful" });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: "IMAP failed", details: String(err) }, { status: 400 });
    }
  } catch (err) {
    console.error("IMAP test error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
