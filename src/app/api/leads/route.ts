import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Leads API error:", err);
    return NextResponse.json(
      { error: "Server error while fetching leads" },
      { status: 500 }
    );
  }
}
