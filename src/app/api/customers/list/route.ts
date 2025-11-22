import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function GET(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Unauthorized" });

    const tenantId = tokenData.tenantId;

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const perPage = 50;

    const search = url.searchParams.get("search") || "";
    const type = url.searchParams.get("type") || "";
    const state = url.searchParams.get("state") || "";
    const pincode = url.searchParams.get("pincode") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    const where: any = { tenantId };

    if (search !== "") {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) where.customerType = type;
    if (state) where.state = state;
    if (pincode) where.pincode = pincode;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({ success: true, customers, total, page, perPage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server Error" });
  }
}
