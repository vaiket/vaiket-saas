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
        amount?: number;
        currency?: string;
        error_code?: string;
        error_description?: string;
      };
    };
  };
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

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
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

    const paymentEntity = payload.payload?.payment?.entity || {};
    const orderId = String(paymentEntity.order_id || "").trim();
    const paymentId = String(paymentEntity.id || "").trim();
    const amountPaise = Number(paymentEntity.amount || 0);
    const amountInr = Number.isFinite(amountPaise) ? Math.round(amountPaise / 100) : 0;
    const currency = String(paymentEntity.currency || "INR").trim() || "INR";

    if (!orderId) {
      return NextResponse.json({ success: true, skipped: true });
    }

    let sub = await prisma.userSubscription.findFirst({
      where: { paymentRef: orderId },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
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
      if (Number.isFinite(subscriptionId) && subscriptionId > 0) {
        sub = await prisma.userSubscription.findUnique({
          where: { id: subscriptionId },
        });
      }
    }

    if (!sub) {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      if (sub.status !== "active") {
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
            paymentRef: paymentId || orderId,
          },
        });
      }

      await prisma.paymentLog.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          provider: "razorpay",
          providerRef: paymentId || orderId,
          amount: amountInr > 0 ? amountInr : sub.amountPaid ?? 0,
          currency,
          status: "success",
          meta: { orderId, event: payload.event, source: "webhook" },
        },
      });
    } else if (payload.event === "payment.failed") {
      if (sub.status !== "active") {
        await prisma.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: "failed",
          },
        });
      }

      await prisma.paymentLog.create({
        data: {
          tenantId: sub.tenantId,
          userId: sub.userId,
          provider: "razorpay",
          providerRef: paymentId || orderId,
          amount: amountInr > 0 ? amountInr : sub.amountPaid ?? 0,
          currency,
          status: "failed",
          meta: {
            orderId,
            event: payload.event,
            source: "webhook",
            errorCode: paymentEntity.error_code || null,
            errorDescription: paymentEntity.error_description || null,
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
