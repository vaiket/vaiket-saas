import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      onboardingCompleted: true,
    },
  });

  return NextResponse.json(user);
}
