import { prisma } from "@/lib/prisma";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const list = await prisma.smtpAccount.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ success: true, list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
