import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const status = String(form.get("status") || "");
    const txnid = String(form.get("txnid") || "");
    const amount = String(form.get("amount") || "");
    const productinfo = String(form.get("productinfo") || "");
    const firstname = String(form.get("firstname") || "");
    const email = String(form.get("email") || "");
    const mihpayid = String(form.get("mihpayid") || "");
    const receivedHash = String(form.get("hash") || "");

    const key = process.env.PAYU_KEY!;
    const salt = process.env.PAYU_SALT!;

    // PayU reverse hash: salt|status|...|email|firstname|productinfo|amount|txnid|key
    const hashString =
      salt +
      "|" +
      status +
      "|||||||||||" +
      email +
      "|" +
      firstname +
      "|" +
      productinfo +
      "|" +
      amount +
      "|" +
      txnid +
      "|" +
      key;

    const expectedHash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    if (expectedHash !== receivedHash) {
      console.error("PayU hash mismatch");
      return NextResponse.json(
        { success: false, error: "Invalid hash" },
        { status: 400 }
      );
    }

    const sub = await prisma.userSubscription.findFirst({
      where: { paymentRef: txnid },
    });

    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { key: sub.planKey },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan missing" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endsAt = new Date(now);

    if (sub.billingCycle === "yearly") {
      endsAt.setDate(endsAt.getDate() + 365);
    } else {
      endsAt.setDate(endsAt.getDate() + 30);
    }

    await prisma.userSubscription.update({
      where: { id: sub.id },
      data:
        status === "success"
          ? {
              status: "active",
              startedAt: now,
              endsAt,
              paymentRef: mihpayid || sub.paymentRef,
            }
          : {
              status: "cancelled",
              paymentRef: mihpayid || sub.paymentRef,
            },
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUrl =
      base + (status === "success" ? "/billing/success" : "/billing/failed");

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("PayU callback error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
