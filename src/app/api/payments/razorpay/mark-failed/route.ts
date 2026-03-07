import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureBillingSchema } from "@/lib/subscriptions/schema";

type MarkFailedBody = {
  subId?: unknown;
  orderId?: unknown;
  reason?: unknown;
  code?: unknown;
};

export async function POST(req: Request) {
  try {
    await ensureBillingSchema();
    const auth = await getAuthContext(req, { allowSessionFallback: true });
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as MarkFailedBody;
    const subId = Number(String(body.subId ?? "").trim());
    const orderId = String(body.orderId ?? "").trim();
    const reason = String(body.reason ?? "").trim() || "Payment failed";
    const code = String(body.code ?? "").trim() || null;

    let subscription = Number.isFinite(subId)
      ? await prisma.userSubscription.findUnique({ where: { id: subId } })
      : null;

    if (!subscription && orderId) {
      subscription = await prisma.userSubscription.findFirst({
        where: {
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

    if (subscription.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const finalStatus = subscription.status === "active" ? "active" : "failed";
    const updated = await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: finalStatus,
      },
    });

    await prisma.paymentLog.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        provider: "razorpay",
        providerRef: orderId || subscription.paymentRef || null,
        amount: updated.amountPaid ?? 0,
        currency: "INR",
        status: finalStatus === "active" ? "success" : "failed",
        meta: {
          subscriptionId: updated.id,
          reason,
          code,
        },
      },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error) {
    console.error("Razorpay mark-failed error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to mark failed payment" },
      { status: 500 }
    );
  }
}
