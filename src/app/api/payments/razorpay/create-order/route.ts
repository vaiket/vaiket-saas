import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";
import { getPlanProduct, isProductKey } from "@/lib/subscriptions/products";

type BillingCycle = "monthly" | "yearly";

type CreateOrderBody = {
  planKey?: unknown;
  billingCycle?: unknown;
  product?: unknown;
};

function asBillingCycle(value: string): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

function getRazorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { keyId, authHeader: `Basic ${basic}` };
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

    const body = (await req.json()) as CreateOrderBody;
    const planKey = String(body.planKey ?? "").trim().toLowerCase();
    const billingCycle = asBillingCycle(
      String(body.billingCycle ?? "").trim().toLowerCase()
    );
    const requestedProduct = String(body.product ?? "").trim().toLowerCase();

    if (!planKey) {
      return NextResponse.json(
        { success: false, error: "Plan key is required" },
        { status: 400 }
      );
    }

    const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
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

    const amountInr = billingCycle === "yearly" ? plan.priceYear : plan.priceMonth;
    if (!amountInr || amountInr <= 0) {
      return NextResponse.json(
        { success: false, error: "Price not configured for selected cycle" },
        { status: 400 }
      );
    }

    const authHeader = getRazorpayAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Razorpay configuration missing" },
        { status: 500 }
      );
    }

    const amountInPaise = Math.round(amountInr * 100);
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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true, mobile: true },
    });

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `sub_${subscription.id}_${Date.now()}`,
        notes: {
          subId: String(subscription.id),
          planKey: plan.key,
          billingCycle,
          product: getPlanProduct(plan.key),
          tenantId: String(auth.tenantId),
          userId: String(auth.userId),
        },
      }),
      cache: "no-store",
    });

    const orderJson = await orderRes.json().catch(() => null);
    if (!orderRes.ok || !orderJson?.id) {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" },
      });
      return NextResponse.json(
        {
          success: false,
          error:
            orderJson?.error?.description ||
            orderJson?.error?.reason ||
            "Razorpay order creation failed",
        },
        { status: 502 }
      );
    }

    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: { paymentRef: String(orderJson.id) },
    });

    await prisma.paymentLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        provider: "razorpay",
        providerRef: String(orderJson.id),
        amount: amountInr,
        currency: "INR",
        status: "initiated",
        meta: {
          subscriptionId: subscription.id,
          planKey: plan.key,
          billingCycle,
        },
      },
    });

    return NextResponse.json({
      success: true,
      provider: "razorpay",
      subId: subscription.id,
      orderId: String(orderJson.id),
      amount: amountInr,
      amountInPaise,
      currency: String(orderJson.currency || "INR"),
      keyId: authHeader.keyId,
      planKey: plan.key,
      planTitle: plan.title,
      product: getPlanProduct(plan.key),
      billingCycle,
      customer: {
        name: user?.name || "User",
        email: user?.email || auth.email,
        contact: user?.mobile || undefined,
      },
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to start Razorpay checkout" },
      { status: 500 }
    );
  }
}
