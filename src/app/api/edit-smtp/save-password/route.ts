import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { tenantId, password } = await req.json();

  await prisma.smtpCredentials.update({
    where: { tenantId },
    data: { password },
  });

  return NextResponse.json({ success: true });
}
