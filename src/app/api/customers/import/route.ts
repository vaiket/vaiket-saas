import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;
    const rows = await req.json();

    await prisma.customer.createMany({
      data: rows.map((r: any) => ({
        tenantId,
        fullName: r.fullName || r.name || "",
        email: r.email || null,
        mobile: r.mobile || null,
        state: r.state || null,
        country: r.country || null,
        pincode: r.pincode || null,
        customerType: r.customerType || null
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Import failed" });
  }
}
