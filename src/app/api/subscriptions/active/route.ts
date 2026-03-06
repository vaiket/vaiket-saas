import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req, { allowSessionFallback: true });
    if (!auth) return NextResponse.json({ subscription: null });

    const url = new URL(req.url);
    const productParam = url.searchParams.get("product");
    const product =
      productParam === "all"
        ? null
        : isProductKey(productParam)
        ? productParam
        : "core";

    const sub = await prisma.userSubscription.findFirst({
      where: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        status: "active",
        ...(product
          ? {
              planKey: {
                startsWith: `${product}_`,
              },
            }
          : {}),
      },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      subscription: sub
        ? {
            ...sub,
            product: getPlanProduct(sub.planKey),
          }
        : null,
      product: product ?? "all",
    });
  } catch {
    return NextResponse.json({ subscription: null });
  }
}
