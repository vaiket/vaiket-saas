// src/app/api/mail-accounts/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getTokenData } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: "Account id missing" }, { status: 400 });

    const existing = await prisma.mailAccount.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tokenData.tenantId) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });
    }

    await prisma.mailAccount.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete Error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
