// src/app/api/payments/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.match(/token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (!decoded?.tenantId) {
      return NextResponse.json({ ok: false, error: "Tenant missing" });
    }

    // ✅ Convert to BigInt for Prisma
    const tenantId = BigInt(decoded.tenantId);

    const payments = await prisma.transactions.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        plan_key: true,
        payu_txn_id: true,
        created_at: true,
      },
    });

    return NextResponse.json({ ok: true, payments });
  } catch (err) {
    console.error("❌ /api/payments/list ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
