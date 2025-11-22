import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;

    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    let csv = "Full Name,Email,Mobile,State,Country,Pincode,Type,Created At\n";

    customers.forEach((c) => {
      csv += `${c.fullName || ""},${c.email || ""},${c.mobile || ""},${c.state || ""},${
        c.country || ""
      },${c.pincode || ""},${c.customerType || ""},${c.createdAt.toISOString()}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=customers.csv",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Export failed" });
  }
}
