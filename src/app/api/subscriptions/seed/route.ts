import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = [
      {
        key: "starter",
        title: "Starter Plan",
        priceMonth: 999,
        priceYear: 9999,
        features: JSON.stringify(["AI Auto Reply", "IMAP Integration"]),
      },
      {
        key: "growth",
        title: "Growth Plan",
        priceMonth: 2999,
        priceYear: 29999,
        features: JSON.stringify([
          "Everything in Starter",
          "Priority Support",
          "Website Crawling (coming soon)",
        ]),
      },
      {
        key: "business",
        title: "Business Plan",
        priceMonth: 4999,
        priceYear: 49999,
        features: JSON.stringify([
          "Everything in Growth",
          "Team members (coming soon)",
        ]),
      },
    ];

    for (const plan of plans) {
      await prisma.subscriptionPlan.upsert({
        where: { key: plan.key },
        update: plan,
        create: plan,
      });
    }

    return NextResponse.json({ success: true, message: "Plans seeded!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
