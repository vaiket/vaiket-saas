// src/app/api/mail-accounts/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getTokenData } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const accounts = await prisma.mailAccount.findMany({
      where: { tenantId: tokenData.tenantId },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ success: true, accounts });
  } catch (err) {
    console.error("List Error:", err);
    return NextResponse.json({ success: false, error: "Failed to load accounts" }, { status: 500 });
  }
}
