import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ subscription: null });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const sub = await prisma.userSubscription.findFirst({
      where: { userId: decoded.userId, status: "active" },
    });

    return NextResponse.json({ subscription: sub || null });
  } catch {
    return NextResponse.json({ subscription: null });
  }
}
