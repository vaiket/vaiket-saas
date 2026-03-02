import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;
    const body = await req.json();

    const existing = await prisma.customer.findUnique({ where: { id: body.id } });
    if (!existing || existing.tenantId !== tenantId)
      return NextResponse.json({ success: false, error: "Not found" });

    const updated = await prisma.customer.update({
      where: { id: body.id },
      data: {
        fullName: body.fullName,
        email: body.email || null,
        mobile: body.mobile || null,
        state: body.state || null,
        country: body.country || null,
        pincode: body.pincode || null,
        customerType: body.customerType || null,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Update failed" });
  }
}
