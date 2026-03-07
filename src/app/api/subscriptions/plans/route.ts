import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProductKey, getPlanProduct } from "@/lib/subscriptions/products";
import { getCatalogPlans } from "@/lib/subscriptions/catalog";
import { ensureBillingSchema } from "@/lib/subscriptions/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestedProduct = url.searchParams.get("product");
  const product =
    requestedProduct === "all"
      ? null
      : isProductKey(requestedProduct)
      ? requestedProduct
      : "core";

  let mapped: Array<Record<string, unknown>> = [];

  try {
    await ensureBillingSchema();
    const plans = await prisma.subscriptionPlan.findMany({
      where: product
        ? {
            key: {
              startsWith: `${product}_`,
            },
          }
        : undefined,
      orderBy: [{ priceMonth: "asc" }, { key: "asc" }],
    });

    mapped = plans.map((plan) => ({
      ...plan,
      product: getPlanProduct(plan.key),
    }));
  } catch {
    mapped = [];
  }

  if (mapped.length === 0) {
    const fallback = getCatalogPlans(product ?? "all");
    mapped = fallback.map((item, index) => ({
      id: -(index + 1),
      key: item.key,
      title: item.title,
      priceMonth: item.priceMonth,
      priceYear: item.priceYear,
      features: JSON.stringify(item.features),
      createdAt: null,
      product: item.product,
      isCatalogFallback: true,
    }));
  }

  return NextResponse.json({ success: true, plans: mapped, product: product ?? "all" });
}
