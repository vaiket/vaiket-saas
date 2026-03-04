import crypto from "crypto";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";
import { getPlanProduct } from "@/lib/subscriptions/products";

type VerifyBody = {
  subId?: unknown;
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  razorpay_subscription_id?: unknown;
};

type RazorpayRefundResponse = {
  id?: string;
  error?: {
    description?: string;
    reason?: string;
  };
};

const TRIAL_AUTOPAY_PLAN_KEY = "whatsapp_starter";
const TRIAL_AUTOPAY_TRIAL_DAYS = 7;
const TRIAL_AUTOPAY_CHARGE_INR = 2;
const TRIAL_AUTOPAY_RECURRING_INR = 999;

function resolveEndsAt(startedAt: Date, billingCycle: string) {
  const endsAt = new Date(startedAt);
  if (billingCycle === "yearly") {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else {
    endsAt.setMonth(endsAt.getMonth() + 1);
  }
  return endsAt;
}

function resolveTrialEndsAt(startedAt: Date) {
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + TRIAL_AUTOPAY_TRIAL_DAYS);
  return endsAt;
}

function getRazorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const basic = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return { keyId, keySecret, authHeader: `Basic ${basic}` };
}

function verifyOrderSignature(
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string
) {
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

function verifySubscriptionSignature(
  keySecret: string,
  subscriptionId: string,
  paymentId: string,
  signature: string
) {
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return expected === signature;
}

function isTrialAutopaySubscription(planKey: string, billingCycle: string) {
  return planKey === TRIAL_AUTOPAY_PLAN_KEY && billingCycle === "monthly";
}

async function findSubscriptionFromInitiatedLog(orderId: string) {
  const initiatedLog = await prisma.paymentLog.findFirst({
    where: {
      provider: "razorpay",
      providerRef: orderId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      meta: true,
    },
  });

  const meta = (initiatedLog?.meta || {}) as Record<string, unknown>;
  const subscriptionId = Number(meta.subscriptionId ?? 0);
  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return null;
  }

  return prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
  });
}

async function tryRefundTrialCharge(params: {
  paymentId: string;
  authHeader: string;
  localSubscriptionId: number;
}) {
  const amountPaise = TRIAL_AUTOPAY_CHARGE_INR * 100;
  const refundRes = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: params.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        speed: "normal",
        notes: {
          localSubscriptionId: String(params.localSubscriptionId),
          reason: "7_day_trial_refund",
        },
      }),
      cache: "no-store",
    }
  );

  const refundJson = (await refundRes.json().catch(() => null)) as RazorpayRefundResponse | null;
  if (!refundRes.ok || !refundJson?.id) {
    return {
      success: false,
      refundId: null,
      error:
        refundJson?.error?.description ||
        refundJson?.error?.reason ||
        "Unable to refund trial charge",
    };
  }

  return {
    success: true,
    refundId: String(refundJson.id),
    error: null,
  };
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

    const body = (await req.json()) as VerifyBody;
    const subIdRaw = String(body.subId ?? "").trim();
    const subId = Number(subIdRaw);
    const orderId = String(body.razorpay_order_id ?? "").trim();
    const paymentId = String(body.razorpay_payment_id ?? "").trim();
    const signature = String(body.razorpay_signature ?? "").trim();
    const autopaySubscriptionId = String(body.razorpay_subscription_id ?? "").trim();

    if (!paymentId || !signature || (!orderId && !autopaySubscriptionId)) {
      return NextResponse.json(
        { success: false, error: "Missing Razorpay verification details" },
        { status: 400 }
      );
    }

    const authHeader = getRazorpayAuthHeader();
    if (!authHeader?.keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay configuration missing" },
        { status: 500 }
      );
    }

    const signatureValid = orderId
      ? verifyOrderSignature(authHeader.keySecret, orderId, paymentId, signature)
      : verifySubscriptionSignature(
          authHeader.keySecret,
          autopaySubscriptionId,
          paymentId,
          signature
        );

    if (!signatureValid) {
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    let subscription = Number.isFinite(subId)
      ? await prisma.userSubscription.findUnique({ where: { id: subId } })
      : null;

    if (!subscription && orderId) {
      subscription = await prisma.userSubscription.findFirst({
        where: {
          userId: auth.userId,
          tenantId: auth.tenantId,
          paymentRef: orderId,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!subscription && orderId) {
      subscription = await findSubscriptionFromInitiatedLog(orderId);
    }

    if (!subscription && autopaySubscriptionId) {
      subscription = await prisma.userSubscription.findFirst({
        where: {
          userId: auth.userId,
          tenantId: auth.tenantId,
          paymentRef: autopaySubscriptionId,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.userId !== auth.userId || subscription.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const trialAutopayMode = isTrialAutopaySubscription(
      subscription.planKey,
      subscription.billingCycle
    );

    if (!orderId && autopaySubscriptionId) {
      if (!trialAutopayMode) {
        return NextResponse.json(
          { success: false, error: "Autopay verification is not enabled for this plan" },
          { status: 400 }
        );
      }

      if (subscription.paymentRef && subscription.paymentRef !== autopaySubscriptionId) {
        return NextResponse.json(
          { success: false, error: "Autopay subscription mismatch" },
          { status: 400 }
        );
      }

      await prisma.paymentLog.create({
        data: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          provider: "razorpay",
          providerRef: paymentId,
          amount: 0,
          currency: "INR",
          status: "success",
          meta: {
            event: "mandate_authorized",
            checkoutMode: "trial_autopay",
            localSubscriptionId: subscription.id,
            autopaySubscriptionId,
            recurringAmountInr: TRIAL_AUTOPAY_RECURRING_INR,
          },
        },
      });

      return NextResponse.json({
        success: true,
        checkoutMode: "trial_autopay",
        autopayAuthorized: true,
        subscription: {
          id: subscription.id,
          planKey: subscription.planKey,
          product: getPlanProduct(subscription.planKey),
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          endsAt: subscription.endsAt,
        },
      });
    }

    if (trialAutopayMode) {
      const resolvedAutopaySubscriptionId =
        autopaySubscriptionId || String(subscription.paymentRef || "").trim();

      if (!resolvedAutopaySubscriptionId) {
        return NextResponse.json(
          { success: false, error: "Autopay subscription ID missing for trial plan" },
          { status: 400 }
        );
      }

      const startedAt = new Date();
      const endsAt = resolveTrialEndsAt(startedAt);
      const refundResult = await tryRefundTrialCharge({
        paymentId,
        authHeader: authHeader.authHeader,
        localSubscriptionId: subscription.id,
      });

      const updated = await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          startedAt,
          endsAt,
          amountPaid: 0,
          paymentRef: resolvedAutopaySubscriptionId,
        },
      });

      await prisma.paymentLog.create({
        data: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          provider: "razorpay",
          providerRef: paymentId,
          amount: TRIAL_AUTOPAY_CHARGE_INR,
          currency: "INR",
          status: "success",
          meta: {
            orderId,
            localSubscriptionId: updated.id,
            planKey: updated.planKey,
            billingCycle: updated.billingCycle,
            checkoutMode: "trial_autopay",
            autopaySubscriptionId: resolvedAutopaySubscriptionId,
            trialDays: TRIAL_AUTOPAY_TRIAL_DAYS,
            trialChargeInr: TRIAL_AUTOPAY_CHARGE_INR,
            trialRefunded: refundResult.success,
            refundId: refundResult.refundId,
            refundError: refundResult.error,
          },
        },
      });

      return NextResponse.json({
        success: true,
        checkoutMode: "trial_autopay",
        trialRefunded: refundResult.success,
        trialRefundId: refundResult.refundId,
        trialRefundError: refundResult.error,
        autopaySubscriptionId: resolvedAutopaySubscriptionId,
        autopayAuthRequired: true,
        subscription: {
          id: updated.id,
          planKey: updated.planKey,
          product: getPlanProduct(updated.planKey),
          status: updated.status,
          billingCycle: updated.billingCycle,
          endsAt: updated.endsAt,
        },
      });
    }

    if (subscription.status === "active") {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        checkoutMode: "one_time",
        subscription: {
          id: subscription.id,
          planKey: subscription.planKey,
          product: getPlanProduct(subscription.planKey),
          status: subscription.status,
          endsAt: subscription.endsAt,
        },
      });
    }

    const dbPlan = await prisma.subscriptionPlan.findUnique({
      where: { key: subscription.planKey },
    });
    const fallbackPlan = dbPlan ? null : getCatalogPlan(subscription.planKey);
    const plan = dbPlan ?? fallbackPlan;

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found for subscription" },
        { status: 404 }
      );
    }

    const amountPaid =
      subscription.billingCycle === "yearly" ? plan.priceYear : plan.priceMonth;
    const startedAt = new Date();
    const endsAt = resolveEndsAt(startedAt, subscription.billingCycle);

    const updated = await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        startedAt,
        endsAt,
        amountPaid: amountPaid ?? null,
        paymentRef: paymentId,
      },
    });

    await prisma.paymentLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        provider: "razorpay",
        providerRef: paymentId,
        amount: amountPaid ?? 0,
        currency: "INR",
        status: "success",
        meta: {
          orderId,
          localSubscriptionId: updated.id,
          planKey: updated.planKey,
          billingCycle: updated.billingCycle,
          checkoutMode: "one_time",
        },
      },
    });

    return NextResponse.json({
      success: true,
      checkoutMode: "one_time",
      subscription: {
        id: updated.id,
        planKey: updated.planKey,
        product: getPlanProduct(updated.planKey),
        status: updated.status,
        billingCycle: updated.billingCycle,
        endsAt: updated.endsAt,
      },
    });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
