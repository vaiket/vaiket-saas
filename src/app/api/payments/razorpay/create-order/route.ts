import { NextResponse } from "next/server";

import { getAuthContext, type AuthContext } from "@/lib/auth/session";
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

type TrialAutopayPlanResolution = {
  planId: string;
  fromEnv: boolean;
};

type TrialAutopayCreateResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

type CheckoutPlan = {
  key: string;
  title: string;
  priceMonth: number;
  priceYear: number | null;
};

type CustomerInfo = {
  name?: string | null;
  email?: string | null;
  contact?: string | null;
};

type OneTimeCheckoutResult =
  | {
      ok: true;
      payload: {
        success: true;
        provider: "razorpay";
        checkoutMode: "one_time";
        subId: number;
        orderId: string;
        amount: number;
        amountInPaise: number;
        currency: string;
        keyId: string;
        planKey: string;
        planTitle: string;
        product: string;
        billingCycle: BillingCycle;
        customer: {
          name?: string;
          email?: string;
          contact?: string;
        };
        autopayFallback?: boolean;
        fallbackReason?: string;
      };
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

const TRIAL_AUTOPAY_PLAN_KEY = "whatsapp_starter";
const TRIAL_AUTOPAY_TRIAL_DAYS = 30;
const TRIAL_AUTOPAY_CHARGE_INR = 2;
const TRIAL_AUTOPAY_RECURRING_INR = 999;
const TRIAL_AUTOPAY_TOTAL_COUNT = 120;

function asBillingCycle(value: string): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

function getRazorpayAuthHeader(): RazorpayAuthConfig | null {
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  if (!keyId || !keySecret) return null;
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { keyId, authHeader: `Basic ${basic}` };
}

function isTrialAutopayPlan(planKey: string, billingCycle: BillingCycle) {
  return planKey === TRIAL_AUTOPAY_PLAN_KEY && billingCycle === "monthly";
}

function resolveOneTimeCheckoutAmount(
  plan: CheckoutPlan,
  billingCycle: BillingCycle
): number | null {
  const configuredAmount =
    billingCycle === "yearly" ? plan.priceYear ?? null : plan.priceMonth ?? null;

  if (typeof configuredAmount === "number" && configuredAmount > 0) {
    if (isTrialAutopayPlan(plan.key, billingCycle) && configuredAmount <= TRIAL_AUTOPAY_CHARGE_INR) {
      return TRIAL_AUTOPAY_RECURRING_INR;
    }
    return configuredAmount;
  }

  if (isTrialAutopayPlan(plan.key, billingCycle)) {
    return TRIAL_AUTOPAY_RECURRING_INR;
  }

  return null;
}

function extractRazorpayError(payload: unknown, fallback: string) {
  const error = payload as
    | {
        error?: {
          description?: string;
          reason?: string;
        };
      }
    | null
    | undefined;

  return error?.error?.description || error?.error?.reason || fallback;
}

function isLikelyPlaceholderPlanId(planId: string) {
  const value = planId.trim().toLowerCase();
  if (!value) return false;
  if (value.includes("xxxx")) return true;
  if (value.includes("your_plan")) return true;
  if (value === "plan_x" || value === "plan_xxx" || value === "plan_xxxxx") {
    return true;
  }
  return false;
}

async function createTrialAutopayPlan(authHeader: string) {
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
        description: `Autopay recurring amount after ${TRIAL_AUTOPAY_TRIAL_DAYS}-day trial`,
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

async function ensureTrialAutopayPlanId(
  authHeader: string,
  opts?: { ignoreEnv?: boolean }
): Promise<TrialAutopayPlanResolution> {
  const envPlanId = String(process.env.RAZORPAY_WHATSAPP_STARTER_999_PLAN_ID ?? "").trim();

  if (!opts?.ignoreEnv && envPlanId) {
    const looksValid = /^plan_[a-zA-Z0-9]+$/.test(envPlanId);
    if (looksValid && !isLikelyPlaceholderPlanId(envPlanId)) {
      return { planId: envPlanId, fromEnv: true };
    }
  }

  const created = await createTrialAutopayPlan(authHeader);
  return { planId: created, fromEnv: false };
}

async function createTrialAutopaySubscription(params: {
  authHeader: string;
  planId: string;
  startAtUnix: number;
  subscriptionId: number;
  planKey: string;
  billingCycle: BillingCycle;
  product: string;
  tenantId: number;
  userId: number;
}): Promise<TrialAutopayCreateResult> {
  const autopayRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      Authorization: params.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      total_count: TRIAL_AUTOPAY_TOTAL_COUNT,
      customer_notify: 0,
      start_at: params.startAtUnix,
      notes: {
        subId: String(params.subscriptionId),
        planKey: params.planKey,
        billingCycle: params.billingCycle,
        product: params.product,
        tenantId: String(params.tenantId),
        userId: String(params.userId),
        checkoutMode: "trial_autopay",
      },
    }),
    cache: "no-store",
  });

  const autopayJson = await autopayRes.json().catch(() => null);
  if (!autopayRes.ok || !autopayJson?.id) {
    return {
      ok: false,
      error:
        autopayJson?.error?.description ||
        autopayJson?.error?.reason ||
        "Razorpay autopay subscription creation failed",
    };
  }

  return { ok: true, id: String(autopayJson.id) };
}

async function createOneTimeCheckout(params: {
  auth: AuthContext;
  authHeader: RazorpayAuthConfig;
  subscriptionId: number;
  plan: CheckoutPlan;
  billingCycle: BillingCycle;
  amountInr: number;
  customer: CustomerInfo;
  meta?: Record<string, unknown>;
  autopayFallback?: boolean;
  fallbackReason?: string;
}): Promise<OneTimeCheckoutResult> {
  await prisma.userSubscription.update({
    where: { id: params.subscriptionId },
    data: {
      status: "pending",
      amountPaid: params.amountInr,
    },
  });

  const amountInPaise = Math.round(params.amountInr * 100);
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: params.authHeader.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${params.subscriptionId}_${Date.now()}`,
      notes: {
        subId: String(params.subscriptionId),
        planKey: params.plan.key,
        billingCycle: params.billingCycle,
        product: getPlanProduct(params.plan.key),
        tenantId: String(params.auth.tenantId),
        userId: String(params.auth.userId),
        checkoutMode: "one_time",
        ...(params.meta || {}),
      },
    }),
    cache: "no-store",
  });

  const orderJson = await orderRes.json().catch(() => null);
  if (!orderRes.ok || !orderJson?.id) {
    await prisma.userSubscription.update({
      where: { id: params.subscriptionId },
      data: { status: "cancelled" },
    });

    return {
      ok: false,
      status: 502,
      error: extractRazorpayError(orderJson, "Razorpay order creation failed"),
    };
  }

  const orderId = String(orderJson.id);
  await prisma.userSubscription.update({
    where: { id: params.subscriptionId },
    data: {
      paymentRef: orderId,
      amountPaid: params.amountInr,
    },
  });

  await prisma.paymentLog.create({
    data: {
      tenantId: params.auth.tenantId,
      userId: params.auth.userId,
      provider: "razorpay",
      providerRef: orderId,
      amount: params.amountInr,
      currency: "INR",
      status: "initiated",
      meta: {
        subscriptionId: params.subscriptionId,
        planKey: params.plan.key,
        billingCycle: params.billingCycle,
        checkoutMode: "one_time",
        ...(params.meta || {}),
      },
    },
  });

  return {
    ok: true,
    payload: {
      success: true,
      provider: "razorpay",
      checkoutMode: "one_time",
      subId: params.subscriptionId,
      orderId,
      amount: params.amountInr,
      amountInPaise,
      currency: String(orderJson.currency || "INR"),
      keyId: params.authHeader.keyId,
      planKey: params.plan.key,
      planTitle: params.plan.title,
      product: getPlanProduct(params.plan.key),
      billingCycle: params.billingCycle,
      customer: {
        name: params.customer.name || "User",
        email: params.customer.email || params.auth.email,
        contact: params.customer.contact || undefined,
      },
      ...(params.autopayFallback
        ? {
            autopayFallback: true,
            fallbackReason: params.fallbackReason || "trial_autopay_unavailable",
          }
        : {}),
    },
  };
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req, { allowSessionFallback: true });
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

    const checkoutPlan: CheckoutPlan = {
      key: plan.key,
      title: plan.title,
      priceMonth: plan.priceMonth,
      priceYear: plan.priceYear ?? null,
    };
    const trialAutopayMode = isTrialAutopayPlan(checkoutPlan.key, billingCycle);
    const oneTimeAmountInr = resolveOneTimeCheckoutAmount(checkoutPlan, billingCycle);
    const amountInr = trialAutopayMode ? TRIAL_AUTOPAY_CHARGE_INR : oneTimeAmountInr;

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
        planKey: checkoutPlan.key,
        billingCycle,
        status: "pending",
        amountPaid: amountInr,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true, mobile: true },
    });
    const customer = {
      name: user?.name || "User",
      email: user?.email || auth.email,
      contact: user?.mobile || undefined,
    };

    if (trialAutopayMode) {
      let createdAutopaySubscriptionId: string | null = null;
      try {
        const nowUnix = Math.floor(Date.now() / 1000);
        const startAtUnix = nowUnix + TRIAL_AUTOPAY_TRIAL_DAYS * 24 * 60 * 60;
        const product = getPlanProduct(checkoutPlan.key);

        let trialPlan = await ensureTrialAutopayPlanId(authHeader.authHeader);
        let autopayResult = await createTrialAutopaySubscription({
          authHeader: authHeader.authHeader,
          planId: trialPlan.planId,
          startAtUnix,
          subscriptionId: subscription.id,
          planKey: checkoutPlan.key,
          billingCycle,
          product,
          tenantId: auth.tenantId,
          userId: auth.userId,
        });

        // If fixed env plan id is invalid/deleted, auto-create a fresh plan and retry once.
        if (!autopayResult.ok && trialPlan.fromEnv) {
          trialPlan = await ensureTrialAutopayPlanId(authHeader.authHeader, {
            ignoreEnv: true,
          });
          autopayResult = await createTrialAutopaySubscription({
            authHeader: authHeader.authHeader,
            planId: trialPlan.planId,
            startAtUnix,
            subscriptionId: subscription.id,
            planKey: plan.key,
            billingCycle,
            product,
            tenantId: auth.tenantId,
            userId: auth.userId,
          });
        }

        if (!autopayResult.ok || !autopayResult.id) {
          throw new Error(
            autopayResult.error || "Razorpay autopay subscription creation failed"
          );
        }

        const autopaySubscriptionId = autopayResult.id;
        createdAutopaySubscriptionId = autopaySubscriptionId;

        await prisma.userSubscription.update({
          where: { id: subscription.id },
          data: { paymentRef: autopaySubscriptionId },
        });

        await prisma.paymentLog.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            provider: "razorpay",
            providerRef: autopaySubscriptionId,
            amount: TRIAL_AUTOPAY_CHARGE_INR,
            currency: "INR",
            status: "initiated",
            meta: {
              subscriptionId: subscription.id,
              planKey: checkoutPlan.key,
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
          amount: TRIAL_AUTOPAY_CHARGE_INR,
          amountInPaise,
          currency: "INR",
          keyId: authHeader.keyId,
          planKey: checkoutPlan.key,
          planTitle: checkoutPlan.title,
          product: getPlanProduct(checkoutPlan.key),
          billingCycle,
          autopaySubscriptionId,
          autopayStartAt: new Date(startAtUnix * 1000).toISOString(),
          trialDays: TRIAL_AUTOPAY_TRIAL_DAYS,
          recurringAmountInr: TRIAL_AUTOPAY_RECURRING_INR,
          customer,
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

        const fallbackReason =
          autopayError instanceof Error
            ? autopayError.message
            : "Unable to start trial autopay checkout";

        await prisma.paymentLog.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            provider: "razorpay",
            providerRef: createdAutopaySubscriptionId,
            amount: TRIAL_AUTOPAY_CHARGE_INR,
            currency: "INR",
            status: "failed",
            meta: {
              subscriptionId: subscription.id,
              planKey: checkoutPlan.key,
              billingCycle,
              checkoutMode: "trial_autopay",
              fallbackTo: "one_time",
              reason: fallbackReason,
            },
          },
        });

        if (!oneTimeAmountInr || oneTimeAmountInr <= 0) {
          await prisma.userSubscription.update({
            where: { id: subscription.id },
            data: { status: "cancelled" },
          });

          return NextResponse.json(
            {
              success: false,
              error: fallbackReason,
            },
            { status: 502 }
          );
        }

        const fallbackCheckout = await createOneTimeCheckout({
          auth,
          authHeader,
          subscriptionId: subscription.id,
          plan: checkoutPlan,
          billingCycle,
          amountInr: oneTimeAmountInr,
          customer,
          autopayFallback: true,
          fallbackReason,
          meta: {
            trialAutopayFallback: true,
            trialAutopayError: fallbackReason,
          },
        });

        if (fallbackCheckout.ok === false) {
          return NextResponse.json(
            {
              success: false,
              error: fallbackCheckout.error,
            },
            { status: fallbackCheckout.status }
          );
        }

        return NextResponse.json(fallbackCheckout.payload);
      }
    }

    const oneTimeCheckout = await createOneTimeCheckout({
      auth,
      authHeader,
      subscriptionId: subscription.id,
      plan: checkoutPlan,
      billingCycle,
      amountInr,
      customer,
    });

    if (oneTimeCheckout.ok === false) {
      return NextResponse.json(
        {
          success: false,
          error: oneTimeCheckout.error,
        },
        { status: oneTimeCheckout.status }
      );
    }

    return NextResponse.json(oneTimeCheckout.payload);
  } catch (error) {
    console.error("Razorpay create-order error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to start Razorpay checkout" },
      { status: 500 }
    );
  }
}
