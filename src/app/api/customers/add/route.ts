import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;
    const body = await req.json();

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        fullName: body.fullName,
        email: body.email || null,
        mobile: body.mobile || null,
        state: body.state || null,
        country: body.country || null,
        pincode: body.pincode || null,
        customerType: body.customerType || null,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Failed to add" });
  }
}
