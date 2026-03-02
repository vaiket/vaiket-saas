import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";

type BillingCycle = "monthly" | "yearly";

type CreatePaymentBody = {
  planKey?: unknown;
  billingCycle?: unknown;
  product?: unknown;
};

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreatePaymentBody;
    const planKey = String(body.planKey ?? "").trim().toLowerCase();
    const billingCycleRaw = String(body.billingCycle ?? "").trim().toLowerCase();
    const billingCycle: BillingCycle =
      billingCycleRaw === "yearly" ? "yearly" : "monthly";

    if (!planKey) {
      return NextResponse.json(
        { success: false, error: "Invalid plan request" },
        { status: 400 }
      );
    }

    const dbPlan = await prisma.subscriptionPlan.findUnique({
      where: { key: planKey },
    });
    const fallbackPlan = dbPlan ? null : getCatalogPlan(planKey);
    const plan = dbPlan ?? fallbackPlan;

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const requestedProduct = String(body.product ?? "").trim().toLowerCase();
    if (requestedProduct && isProductKey(requestedProduct)) {
      const planProduct = getPlanProduct(plan.key);
      if (planProduct !== requestedProduct) {
        return NextResponse.json(
          { success: false, error: "Plan does not belong to selected product" },
          { status: 400 }
        );
      }
    }

    const amount = billingCycle === "yearly" ? plan.priceYear : plan.priceMonth;
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Price not configured for selected cycle" },
        { status: 400 }
      );
    }

    const subscription = await prisma.userSubscription.create({
      data: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        planKey: plan.key,
        billingCycle,
        status: "pending",
        amountPaid: null,
      },
    });

    return NextResponse.json({
      success: true,
      subId: subscription.id,
      amount,
      currency: "INR",
      planKey: plan.key,
      product: getPlanProduct(plan.key),
      billingCycle,
    });
  } catch (error) {
    console.error("Payment Create Error:", error);
    return NextResponse.json(
      { success: false, error: "Payment creation failed" },
      { status: 500 }
    );
  }
}
