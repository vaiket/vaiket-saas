import crypto from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";

type BillingCycle = "monthly" | "yearly";

type Body = {
  planKey?: unknown;
  billingCycle?: unknown;
  product?: unknown;
};

function asBillingCycle(value: string): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;
    const planKey = String(body.planKey ?? "").trim().toLowerCase();
    const billingCycle = asBillingCycle(String(body.billingCycle ?? "").trim().toLowerCase());
    const requestedProduct = String(body.product ?? "").trim().toLowerCase();

    if (!planKey) {
      return NextResponse.json(
        { success: false, error: "Plan key is required" },
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

    if (requestedProduct && isProductKey(requestedProduct)) {
      if (getPlanProduct(plan.key) !== requestedProduct) {
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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true, mobile: true },
    });

    const txnid = `VAI${Date.now()}`;
    const subscription = await prisma.userSubscription.create({
      data: {
        userId: auth.userId,
        tenantId: auth.tenantId,
        planKey: plan.key,
        status: "pending",
        billingCycle,
        paymentRef: txnid,
      },
    });

    const payuKey = process.env.PAYU_KEY;
    const payuSalt = process.env.PAYU_SALT;
    const payuUrl = process.env.PAYU_GATEWAY_URL;
    const successUrl =
      process.env.PAYU_SUCCESS_URL || process.env.PAYU_SUCCESS_REDIRECT_URL;
    const failureUrl =
      process.env.PAYU_FAILURE_URL || process.env.PAYU_FAILURE_REDIRECT_URL;

    if (!payuKey || !payuSalt || !payuUrl || !successUrl || !failureUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "PayU config missing",
          subId: subscription.id,
        },
        { status: 500 }
      );
    }

    const firstname = user?.name?.trim() || "User";
    const email = user?.email?.trim() || auth.email || "user@example.com";
    const phone = user?.mobile?.trim() || "9999999999";
    const productInfo = plan.title;

    const hashString = `${payuKey}|${txnid}|${amount}|${productInfo}|${firstname}|${email}|||||||||||${payuSalt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const params: Record<string, string | number> = {
      key: payuKey,
      txnid,
      amount,
      productinfo: productInfo,
      firstname,
      email,
      phone,
      surl: successUrl,
      furl: failureUrl,
      hash,
      udf1: subscription.id,
    };

    const query = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {})
    ).toString();

    return NextResponse.json({
      success: true,
      subId: subscription.id,
      payuUrl,
      params,
      checkoutUrl: `${payuUrl}?${query}`,
      product: getPlanProduct(plan.key),
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { success: false, error: "Checkout failed" },
      { status: 500 }
    );
  }
}
