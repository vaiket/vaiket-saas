import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany();
  return NextResponse.json({ success: true, plans });
}
