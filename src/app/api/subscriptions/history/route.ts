import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const productParam = url.searchParams.get("product");
    const product =
      productParam === "all"
        ? null
        : isProductKey(productParam)
        ? productParam
        : "core";

    const history = await prisma.userSubscription.findMany({
      where: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        ...(product
          ? {
              planKey: {
                startsWith: `${product}_`,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        history: history.map((item) => ({
          ...item,
          product: getPlanProduct(item.planKey),
        })),
        product: product ?? "all",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("History API Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
