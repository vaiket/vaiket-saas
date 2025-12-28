import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId = Number(searchParams.get("accountId"));

    if (!accountId)
      return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

    // ❗ Fetch account
    const acc = await prisma.mailAccount.findUnique({
      where: { id: accountId }
    });

    // ❗ DISALLOW CROSS TENANT ACCESS
    if (!acc || acc.tenantId !== token.tenantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Not your email account" },
        { status: 403 }
      );
    }

    // Load ONLY this user's emails
    const emails = await prisma.incomingEmail.findMany({
      where: {
        mailAccountId: acc.id,
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, emails });

  } catch (err: any) {
    console.error("INBOX ERROR:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
