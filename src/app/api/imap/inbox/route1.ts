import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const accountId = Number(url.searchParams.get("accountId"));
    if (!accountId) return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });

    const account = await prisma.mailAccount.findUnique({ where: { id: accountId } });
    if (!account || account.tenantId !== tokenData.tenantId) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const emails = await prisma.incomingEmail.findMany({
      where: { mailAccountId: accountId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ success: true, emails });
  } catch (err) {
    console.error("IMAP inbox error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
