import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;
    const body = await req.json();

    if (body.ids) {
      await prisma.customer.deleteMany({
        where: { tenantId, id: { in: body.ids } },
      });
      return NextResponse.json({ success: true, deleted: body.ids.length });
    }

    await prisma.customer.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Delete failed" });
  }
}
