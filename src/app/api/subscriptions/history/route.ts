import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;
    const tenantId = decoded.tenantId;

    const history = await prisma.userSubscription.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (err) {
    console.error("History API Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
