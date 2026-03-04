import crypto from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        subscription_id?: string;
        amount?: number;
        currency?: string;
        error_code?: string;
        error_description?: string;
      };
    };
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
};

const TRIAL_AUTOPAY_PLAN_KEY = "whatsapp_starter";

function resolveEndsAt(startedAt: Date, billingCycle: string) {
  const endsAt = new Date(startedAt);
  if (billingCycle === "yearly") {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else {
    endsAt.setMonth(endsAt.getMonth() + 1);
  }
  return endsAt;
}

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

function isRecurringSuccessEvent(event: string) {
  return (
    event === "payment.captured" ||
    event === "order.paid" ||
    event === "subscription.charged" ||
    event === "invoice.paid"
  );
}

function isFailureEvent(event: string) {
  return (
    event === "payment.failed" ||
    event === "subscription.halted" ||
    event === "subscription.paused" ||
    event === "subscription.cancelled"
  );
}

async function findSubscription(params: { orderId: string; externalSubscriptionId: string }) {
  const { orderId, externalSubscriptionId } = params;

  if (externalSubscriptionId) {
    const byExternalSub = await prisma.userSubscription.findFirst({
      where: { paymentRef: externalSubscriptionId },
      orderBy: { createdAt: "desc" },
    });
    if (byExternalSub) return byExternalSub;
  }

  if (orderId) {
    const byOrder = await prisma.userSubscription.findFirst({
      where: { paymentRef: orderId },
      orderBy: { createdAt: "desc" },
    });
    if (byOrder) return byOrder;
  }

  if (orderId) {
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
    const localSubscriptionId = Number(
      meta.localSubscriptionId ?? meta.subscriptionId ?? 0
    );
    if (Number.isFinite(localSubscriptionId) && localSubscriptionId > 0) {
      const byId = await prisma.userSubscription.findUnique({
        where: { id: localSubscriptionId },
      });
      if (byId) return byId;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    const raw = await req.text();

    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    let payload: RazorpayWebhookEvent | null = null;
    try {
      payload = JSON.parse(raw) as RazorpayWebhookEvent;
    } catch {
      payload = null;
    }

    if (!payload?.event) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity || {};
    const subscriptionEntity = payload.payload?.subscription?.entity || {};
    const orderId = String(paymentEntity.order_id || "").trim();
    const paymentId = String(paymentEntity.id || "").trim();
    const externalSubscriptionId = String(
      paymentEntity.subscription_id || subscriptionEntity.id || ""
    ).trim();
    const amountPaise = Number(paymentEntity.amount || 0);
    const amountInr = Number.isFinite(amountPaise) ? Math.round(amountPaise / 100) : 0;
    const currency = String(paymentEntity.currency || "INR").trim() || "INR";

    const sub = await findSubscription({ orderId, externalSubscriptionId });
    if (!sub) {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (isRecurringSuccessEvent(event)) {
      const now = new Date();
      const isTrialAutopay =
        sub.planKey === TRIAL_AUTOPAY_PLAN_KEY &&
        sub.billingCycle === "monthly" &&
        Boolean(externalSubscriptionId) &&
        sub.paymentRef === externalSubscriptionId;

      if (isTrialAutopay && amountInr > 0) {
        const baseDate = sub.endsAt && sub.endsAt > now ? sub.endsAt : now;
        const nextEndsAt = resolveEndsAt(baseDate, sub.billingCycle);

        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: "active",
            endsAt: nextEndsAt,
            amountPaid: amountInr,
            paymentRef: externalSubscriptionId,
            startedAt: sub.startedAt || now,
          },
        });
      } else if (sub.status !== "active") {
        const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { key: sub.planKey } });
        const fallbackPlan = dbPlan ? null : getCatalogPlan(sub.planKey);
        const plan = dbPlan ?? fallbackPlan;
        const amountFromPlan =
          sub.billingCycle === "yearly" ? plan?.priceYear ?? null : plan?.priceMonth ?? null;

        const startedAt = new Date();
        const endsAt = resolveEndsAt(startedAt, sub.billingCycle);

        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: "active",
            startedAt,
            endsAt,
            amountPaid: amountFromPlan ?? (amountInr > 0 ? amountInr : null),
            paymentRef: paymentId || orderId || externalSubscriptionId || sub.paymentRef,
          },
        });
      }

      await prisma.paymentLog.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          provider: "razorpay",
          providerRef: paymentId || orderId || externalSubscriptionId || null,
          amount: amountInr > 0 ? amountInr : sub.amountPaid ?? 0,
          currency,
          status: "success",
          meta: {
            orderId,
            event,
            source: "webhook",
            externalSubscriptionId: externalSubscriptionId || null,
          },
        },
      });
    } else if (isFailureEvent(event)) {
      if (event === "subscription.cancelled") {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: { status: "cancelled" },
        });
      } else if (sub.status !== "active") {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: { status: "failed" },
        });
      }

      await prisma.paymentLog.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          provider: "razorpay",
          providerRef: paymentId || orderId || externalSubscriptionId || null,
          amount: amountInr > 0 ? amountInr : sub.amountPaid ?? 0,
          currency,
          status: "failed",
          meta: {
            orderId,
            event,
            source: "webhook",
            externalSubscriptionId: externalSubscriptionId || null,
            subscriptionStatus: subscriptionEntity.status || null,
            errorCode: paymentEntity.error_code || null,
            errorDescription: paymentEntity.error_description || null,
          },
        },
      });
    } else {
      await prisma.paymentLog.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          provider: "razorpay",
          providerRef: paymentId || orderId || externalSubscriptionId || null,
          amount: amountInr > 0 ? amountInr : 0,
          currency,
          status: "initiated",
          meta: {
            orderId,
            event,
            source: "webhook",
            externalSubscriptionId: externalSubscriptionId || null,
            subscriptionStatus: subscriptionEntity.status || null,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
