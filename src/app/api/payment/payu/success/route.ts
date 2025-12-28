import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const status = body.get("status") as string;
    const txnid = body.get("txnid") as string;
    const amount = body.get("amount") as string;
    const productinfo = body.get("productinfo") as string;
    const firstname = body.get("firstname") as string;
    const email = body.get("email") as string;
    const receivedHash = body.get("hash") as string;

    // 1️⃣ Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { txnid },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // 2️⃣ Recreate hash (PayU rule)
    const salt = process.env.PAYU_SALT!;
    const hashString =
      `${salt}|${status}|||||||||||` +
      `${email}|${firstname}|${productinfo}|${amount}|${txnid}|${process.env.PAYU_KEY}`;

    const expectedHash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    if (expectedHash !== receivedHash) {
      // ❌ Possible tampering
      await prisma.payment.update({
        where: { txnid },
        data: {
          status: "FAILED",
          raw: Object.fromEntries(body.entries()),
        },
      });

      return NextResponse.redirect(
        new URL("/dashboard/Subscriptions?payment=failed", req.url)
      );
    }

    // 3️⃣ Mark payment SUCCESS
    await prisma.payment.update({
      where: { txnid },
      data: {
        status: "SUCCESS",
        raw: Object.fromEntries(body.entries()),
      },
    });

    // 4️⃣ Activate subscription
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + 30); // 30 days

    await prisma.userSubscription.upsert({
      where: {
        tenantId_planKey: {
          tenantId: payment.tenantId!,
          planKey: payment.product!,
        },
      },
      update: {
        status: "ACTIVE",
        endsAt,
      },
      create: {
        tenantId: payment.tenantId!,
        userId: payment.userId!,
        planKey: payment.product!,
        status: "ACTIVE",
        startedAt: now,
        endsAt,
        amountPaid: payment.amount,
      },
    });

    // 5️⃣ Redirect user to dashboard
    return NextResponse.redirect(
      new URL("/dashboard/Subscriptions?payment=success", req.url)
    );
  } catch (err) {
    console.error("❌ PayU Success Error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/Subscriptions?payment=error", req.url)
    );
  }
}
