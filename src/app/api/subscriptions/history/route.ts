import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req, { allowSessionFallback: true });
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

    const planKeys = Array.from(new Set(history.map((item) => item.planKey)));
    const dbPlans = planKeys.length
      ? await prisma.subscriptionPlan.findMany({
          where: { key: { in: planKeys } },
          select: { key: true, priceMonth: true, priceYear: true },
        })
      : [];
    const dbPlanMap = new Map(dbPlans.map((plan) => [plan.key, plan]));

    return NextResponse.json(
      {
        history: history.map((item) => ({
          ...item,
          amountPaid:
            item.amountPaid ??
            (() => {
              const dbPlan = dbPlanMap.get(item.planKey);
              const fallbackPlan = dbPlan ? null : getCatalogPlan(item.planKey);
              const monthAmount = dbPlan?.priceMonth ?? fallbackPlan?.priceMonth ?? null;
              const yearAmount = dbPlan?.priceYear ?? fallbackPlan?.priceYear ?? null;

              if (item.billingCycle === "yearly") {
                return yearAmount ?? monthAmount ?? null;
              }
              return monthAmount ?? null;
            })(),
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
