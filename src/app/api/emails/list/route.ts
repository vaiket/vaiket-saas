import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const emails = await prisma.incomingEmail.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, emails });

  } catch (error) {
    console.error("List Emails Error:", error);
    return NextResponse.json({ success: false });
  }
}
