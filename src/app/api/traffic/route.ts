import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stats = await prisma.traffic.findMany({
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Traffic API error:", err);
    return NextResponse.json(
      { error: "Error fetching traffic" },
      { status: 500 }
    );
  }
}
