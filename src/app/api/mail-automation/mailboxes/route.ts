import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const tenantId = req.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Tenant ID missing" },
        { status: 401 }
      );
    }

    const mailboxes = await prisma.tenantMailbox.findMany({
      where: {
        tenantId: Number(tenantId),
        active: true,
      },
      select: {
        id: true,
        email: true,
        domain: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      mailboxes,
    });
  } catch (err) {
    console.error("MAILBOX LIST ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch mailboxes" },
      { status: 500 }
    );
  }
}
