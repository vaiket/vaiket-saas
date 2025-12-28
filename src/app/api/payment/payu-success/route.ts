import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const status = body.get("status");
    const txnid = body.get("txnid");
    const subId = body.get("udf1"); // Subscription ID sent earlier
    const amount = body.get("amount");

    if (!subId) {
      return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 });
    }

    // Fetch subscription record
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: Number(subId) }
    });

    if (!subscription) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 404 });
    }

    if (status === "success") {
      const startedAt = new Date();
      const endsAt = new Date();

      if (subscription.billingCycle === "monthly") {
        endsAt.setMonth(endsAt.getMonth() + 1);
      } else {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      }

      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          amountPaid: Number(amount),
          startedAt,
          endsAt,
          paymentRef: txnid as string,
        },
      });
    }

    // Redirect user to billing page
    return NextResponse.redirect(
      new URL(`/dashboard/billing?success=${status}`, req.url)
    );
  } catch (err) {
    console.error("PayU SUCCESS Error:", err);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
