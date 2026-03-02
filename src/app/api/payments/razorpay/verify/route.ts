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
};

function resolveEndsAt(startedAt: Date, billingCycle: string) {
  const endsAt = new Date(startedAt);
  if (billingCycle === "yearly") {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else {
    endsAt.setMonth(endsAt.getMonth() + 1);
  }
  return endsAt;
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

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing Razorpay payment details" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay configuration missing" },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    let subscription = Number.isFinite(subId)
      ? await prisma.userSubscription.findUnique({ where: { id: subId } })
      : null;

    if (!subscription) {
      subscription = await prisma.userSubscription.findFirst({
        where: {
          userId: auth.userId,
          tenantId: auth.tenantId,
          paymentRef: orderId,
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

    if (subscription.status === "active") {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
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
          subscriptionId: updated.id,
          planKey: updated.planKey,
          billingCycle: updated.billingCycle,
        },
      },
    });

    return NextResponse.json({
      success: true,
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
