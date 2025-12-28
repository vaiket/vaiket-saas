import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

// Pricing list
const PRICE_TABLE = {
  starter: { monthly: 49, yearly: 199 },
  professional: { monthly: 99, yearly: 499 },
  enterprise: { monthly: 199, yearly: 999 },
};

export async function POST(req: Request) {
  try {
    const { planKey, billingCycle } = await req.json();
    const token = req.headers.get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const userId = decoded.userId;
    const tenantId = decoded.tenantId || 1;

    if (!planKey || !billingCycle) {
      return NextResponse.json(
        { success: false, error: "Invalid plan request" },
        { status: 400 }
      );
    }

    const amount = PRICE_TABLE?.[planKey]?.[billingCycle];
    if (!amount) {
      return NextResponse.json(
        { success: false, error: "Price not configured" },
        { status: 400 }
      );
    }

    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        tenantId,
        planKey,
        billingCycle,
        status: "pending",
        amountPaid: null,
      },
    });

    return NextResponse.json({
      success: true,
      subId: subscription.id,
      amount,
      currency: "INR",
      planKey,
      billingCycle,
    });
  } catch (error) {
    console.error("PayU Create Error:", error);
    return NextResponse.json(
      { success: false, error: "Payment creation failed" },
      { status: 500 }
    );
  }
}
