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

type RazorpayAuthConfig = {
  keyId: string;
  authHeader: string;
};

const TRIAL_AUTOPAY_PLAN_KEY = "whatsapp_starter";
const TRIAL_AUTOPAY_TRIAL_DAYS = 7;
const TRIAL_AUTOPAY_CHARGE_INR = 2;
const TRIAL_AUTOPAY_RECURRING_INR = 999;
const TRIAL_AUTOPAY_TOTAL_COUNT = 120;

function asBillingCycle(value: string): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

function getRazorpayAuthHeader(): RazorpayAuthConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { keyId, authHeader: `Basic ${basic}` };
}

function isTrialAutopayPlan(planKey: string, billingCycle: BillingCycle) {
  return planKey === TRIAL_AUTOPAY_PLAN_KEY && billingCycle === "monthly";
}

async function ensureTrialAutopayPlanId(authHeader: string) {
  const envPlanId = String(process.env.RAZORPAY_WHATSAPP_STARTER_999_PLAN_ID ?? "").trim();
  if (envPlanId) return envPlanId;

  const createPlanRes = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: "WhatsApp Starter Monthly 999",
        amount: TRIAL_AUTOPAY_RECURRING_INR * 100,
        currency: "INR",
        description: "Autopay recurring amount after 7-day trial",
      },
      notes: {
        source: "vaiket_autopay_trial",
        planKey: TRIAL_AUTOPAY_PLAN_KEY,
      },
    }),
    cache: "no-store",
  });

  const createPlanJson = await createPlanRes.json().catch(() => null);
  if (!createPlanRes.ok || !createPlanJson?.id) {
    throw new Error(
      createPlanJson?.error?.description ||
        createPlanJson?.error?.reason ||
        "Razorpay plan creation failed"
    );
  }

  return String(createPlanJson.id);
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

    const trialAutopayMode = isTrialAutopayPlan(plan.key, billingCycle);
    const amountInr = trialAutopayMode
      ? TRIAL_AUTOPAY_CHARGE_INR
      : billingCycle === "yearly"
      ? plan.priceYear
      : plan.priceMonth;

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

    if (trialAutopayMode) {
      let createdAutopaySubscriptionId: string | null = null;
      try {
        const nowUnix = Math.floor(Date.now() / 1000);
        const startAtUnix = nowUnix + TRIAL_AUTOPAY_TRIAL_DAYS * 24 * 60 * 60;
        const trialAutopayPlanId = await ensureTrialAutopayPlanId(authHeader.authHeader);

        const autopayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
          method: "POST",
          headers: {
            Authorization: authHeader.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: trialAutopayPlanId,
            total_count: TRIAL_AUTOPAY_TOTAL_COUNT,
            customer_notify: 0,
            start_at: startAtUnix,
            notes: {
              subId: String(subscription.id),
              planKey: plan.key,
              billingCycle,
              product: getPlanProduct(plan.key),
              tenantId: String(auth.tenantId),
              userId: String(auth.userId),
              checkoutMode: "trial_autopay",
            },
          }),
          cache: "no-store",
        });
        const autopayJson = await autopayRes.json().catch(() => null);

        if (!autopayRes.ok || !autopayJson?.id) {
          throw new Error(
            autopayJson?.error?.description ||
              autopayJson?.error?.reason ||
              "Razorpay autopay subscription creation failed"
          );
        }

        const autopaySubscriptionId = String(autopayJson.id);
        createdAutopaySubscriptionId = autopaySubscriptionId;
        const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: authHeader.authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `trial_${subscription.id}_${Date.now()}`,
            notes: {
              subId: String(subscription.id),
              planKey: plan.key,
              billingCycle,
              product: getPlanProduct(plan.key),
              tenantId: String(auth.tenantId),
              userId: String(auth.userId),
              checkoutMode: "trial_autopay",
              autopaySubscriptionId,
            },
          }),
          cache: "no-store",
        });
        const orderJson = await orderRes.json().catch(() => null);

        if (!orderRes.ok || !orderJson?.id) {
          throw new Error(
            orderJson?.error?.description ||
              orderJson?.error?.reason ||
              "Razorpay trial order creation failed"
          );
        }

        await prisma.userSubscription.update({
          where: { id: subscription.id },
          data: { paymentRef: autopaySubscriptionId },
        });

        await prisma.paymentLog.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            provider: "razorpay",
            providerRef: String(orderJson.id),
            amount: TRIAL_AUTOPAY_CHARGE_INR,
            currency: "INR",
            status: "initiated",
            meta: {
              subscriptionId: subscription.id,
              planKey: plan.key,
              billingCycle,
              checkoutMode: "trial_autopay",
              autopaySubscriptionId,
              trialDays: TRIAL_AUTOPAY_TRIAL_DAYS,
              recurringAmountInr: TRIAL_AUTOPAY_RECURRING_INR,
              autopayStartAtUnix: startAtUnix,
            },
          },
        });

        return NextResponse.json({
          success: true,
          provider: "razorpay",
          checkoutMode: "trial_autopay",
          subId: subscription.id,
          orderId: String(orderJson.id),
          amount: TRIAL_AUTOPAY_CHARGE_INR,
          amountInPaise,
          currency: String(orderJson.currency || "INR"),
          keyId: authHeader.keyId,
          planKey: plan.key,
          planTitle: plan.title,
          product: getPlanProduct(plan.key),
          billingCycle,
          autopaySubscriptionId,
          autopayStartAt: new Date(startAtUnix * 1000).toISOString(),
          trialDays: TRIAL_AUTOPAY_TRIAL_DAYS,
          recurringAmountInr: TRIAL_AUTOPAY_RECURRING_INR,
          customer: {
            name: user?.name || "User",
            email: user?.email || auth.email,
            contact: user?.mobile || undefined,
          },
        });
      } catch (autopayError) {
        if (createdAutopaySubscriptionId) {
          await fetch(
            `https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(
              createdAutopaySubscriptionId
            )}/cancel`,
            {
              method: "POST",
              headers: {
                Authorization: authHeader.authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ cancel_at_cycle_end: 0 }),
              cache: "no-store",
            }
          ).catch(() => null);
        }

        await prisma.userSubscription.update({
          where: { id: subscription.id },
          data: { status: "cancelled" },
        });

        return NextResponse.json(
          {
            success: false,
            error:
              autopayError instanceof Error
                ? autopayError.message
                : "Unable to start trial autopay checkout",
          },
          { status: 502 }
        );
      }
    }

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
          checkoutMode: "one_time",
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
          checkoutMode: "one_time",
        },
      },
    });

    return NextResponse.json({
      success: true,
      provider: "razorpay",
      checkoutMode: "one_time",
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
