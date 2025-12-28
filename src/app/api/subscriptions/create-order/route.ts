import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { planKey, billingCycle } = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { tenantId, userId } = decoded;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { key: planKey },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const amount = billingCycle === "yearly" ? plan.priceYear : plan.priceMonth;
    const txnid = "txn_" + Date.now();

    // Save as pending order
    await prisma.userSubscription.create({
      data: {
        userId,
        tenantId,
        planKey,
        status: "pending",
        billingCycle,
        paymentRef: txnid,
      },
    });

    const SALT = process.env.PAYU_SALT!;
    if (!SALT) {
      console.error("❌ PAYU_SALT NOT FOUND in .env");
      return NextResponse.json({ error: "Payment config missing" }, { status: 500 });
    }

    const hashString = `${process.env.PAYU_KEY}|${txnid}|${amount}|${plan.title}|user|user@example.com|||||||||||${SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const checkoutUrl =
      `${process.env.PAYU_GATEWAY_URL}` +
      `?key=${process.env.PAYU_KEY}` +
      `&txnid=${txnid}` +
      `&amount=${amount}` +
      `&productinfo=${plan.title}` +
      `&firstname=user` +
      `&email=user@example.com` +
      `&hash=${hash}` +
      `&surl=${process.env.PAYU_SUCCESS_REDIRECT_URL}` +
      `&furl=${process.env.PAYU_FAILURE_REDIRECT_URL}`;

    return NextResponse.json({ checkoutUrl });

  } catch (err) {
    console.error("Payment Error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
