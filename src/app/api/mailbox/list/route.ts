import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const mailboxes = await prisma.tenantMailbox.findMany({
      where: { tenantId: user.tenantId },
      select: {
        email: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      mailboxes: mailboxes.map((m) => ({
        email: m.email,
        status: m.active ? "active" : "inactive",
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
