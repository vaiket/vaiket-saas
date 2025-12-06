// src/app/api/payments/success/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const status = formData.get("status")?.toString();
    const txnid = formData.get("txnid")?.toString();
    const mihpayid = formData.get("mihpayid")?.toString();
    const amountStr = formData.get("amount")?.toString() || "0";
    const email = formData.get("email")?.toString() || "";
    const firstname = formData.get("firstname")?.toString() || "";
    const productinfo = formData.get("productinfo")?.toString() || "";
    const udf1 = formData.get("udf1")?.toString(); // subscription id
    const receivedHash = formData.get("hash")?.toString();

    const key = process.env.PAYU_KEY!;
    const salt = process.env.PAYU_SALT!;

    // PayU response hash: salt|status|...|email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amountStr}|${txnid}|${key}`;
    const calculatedHash = crypto.createHash("sha512").update(hashString).digest("hex");

    if (receivedHash && receivedHash !== calculatedHash) {
      console.error("❌ PayU hash mismatch", { receivedHash, calculatedHash });
      // Optionally treat as failed:
      return NextResponse.redirect(
        new URL("/dashboard/settings/billing?payment=hash_failed", req.url)
      );
    }

    if (!txnid || status !== "success") {
      return NextResponse.redirect(
        new URL("/dashboard/settings/billing?payment=failed", req.url)
      );
    }

    // 1) Subscription find (prefer udf1)
    let subscription = null;

    if (udf1) {
      subscription = await prisma.userSubscription.findUnique({
        where: { id: Number(udf1) },
      });
    }

    if (!subscription) {
      subscription = await prisma.userSubscription.findFirst({
        where: { paymentRef: txnid },
      });
    }

    if (!subscription) {
      console.error("No subscription found for txnid", { txnid, udf1 });
      return NextResponse.redirect(
        new URL("/dashboard/settings/billing?payment=not_found", req.url)
      );
    }

    const amount = Number(amountStr) || 0;
    const now = new Date();
    const endsAt = new Date(now);

    if (subscription.billingCycle === "yearly") {
      endsAt.setFullYear(now.getFullYear() + 1);
    } else {
      endsAt.setMonth(now.getMonth() + 1);
    }

    // 2) Mark subscription active
    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        startedAt: now,
        endsAt,
        amountPaid: amount,
        paymentRef: mihpayid || txnid,
      },
    });

    // ✅ Now Billing page me:
    // - Current plan ACTIVE dikh jaayega
    // - amountPaid populated hoga
    // - Invoice download working (jo tumne abhi PDF ke liye banaya hai)

    return NextResponse.redirect(
      new URL("/dashboard/settings/billing?payment=success", req.url)
    );
  } catch (error) {
    console.error("Payment success callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings/billing?payment=error", req.url)
    );
  }
}
