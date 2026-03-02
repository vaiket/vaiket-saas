// src/app/api/payments/pay/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_GATEWAY_URL,
  PAYU_SUCCESS_URL,
  PAYU_FAILURE_URL,
} = process.env;

async function getUserId() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { subId, amount } = await req.json();
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!subId || !amount) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subId },
    });

    if (!subscription || subscription.userId !== userId) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const txnid = `VAI${Date.now()}`;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const productInfo = subscription.planKey.toUpperCase();
    const firstname = user?.name || "User";
    const email = user?.email || "user@example.com";

    const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productInfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    await prisma.userSubscription.update({
      where: { id: subId },
      data: { paymentRef: txnid },
    });

    return NextResponse.json({
      payUrl: PAYU_GATEWAY_URL,
      params: {
        key: PAYU_KEY,
        txnid,
        amount,
        productinfo: productInfo,
        firstname,
        email,
        phone: user?.mobile || "9999999999",
        surl: PAYU_SUCCESS_URL,
        furl: PAYU_FAILURE_URL,
        hash,
        udf1: subId,
      },
    });
  } catch (error) {
    console.error("PayU Pay Error:", error);
    return NextResponse.json(
      { error: "Payment redirect failed" },
      { status: 500 }
    );
  }
}
