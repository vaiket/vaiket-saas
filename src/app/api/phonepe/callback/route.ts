import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const txnId = body.data.merchantTransactionId;
    const status = body.code === "PAYMENT_SUCCESS" ? "SUCCESS" : "FAILED";

    // Update payment status
    const payment = await prisma.payment.update({
      where: { providerTxnId: txnId },
      data: { status },
    });

    if (status === "SUCCESS") {
      // Activate subscription
      await prisma.userSubscription.create({
        data: {
          userId: payment.userId,
          tenantId: payment.tenantId,
          planName: payment.planName,
          amount: payment.amount,
          paymentId: payment.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: { isPaid: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
