import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    // 🔐 Read token from cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);

    if (!tokenMatch) {
      return NextResponse.json({ isActive: false });
    }

    const token = tokenMatch[1];

    // 🔐 Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ isActive: false });
    }

    const userId = decoded.userId;
    const tenantId = decoded.tenantId;

    if (!userId || !tenantId) {
      return NextResponse.json({ isActive: false });
    }

    // ✅ Check payment status
    const payment = await prisma.payment.findFirst({
      where: {
        userId,
        tenantId,
        status: "SUCCESS",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      isActive: !!payment,
    });
  } catch (error) {
    console.error("Payment status API error:", error);
    return NextResponse.json({ isActive: false });
  }
}
