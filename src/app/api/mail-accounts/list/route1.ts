import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { tenantId } = tokenData;

    const accounts = await prisma.mailAccount.findMany({
      where: { tenantId },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ success: true, accounts });

  } catch (err) {
    console.error("List Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load accounts" },
      { status: 500 }
    );
  }
}
