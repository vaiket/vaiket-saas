import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ active: false });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId: Number(userId), // FIXED ✔
        status: "active",
        endsAt: { gt: new Date() },
      },
    });

    return NextResponse.json({ active: !!subscription });
  } catch (err) {
    console.error("Subscription Check Error:", err);
    return NextResponse.json({ active: false });
  }
}

export const dynamic = "force-dynamic";
