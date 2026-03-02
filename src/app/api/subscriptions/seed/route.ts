import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_CATALOG } from "@/lib/subscriptions/catalog";

export async function GET() {
  try {
    for (const catalog of SUBSCRIPTION_CATALOG) {
      const plan = {
        key: catalog.key,
        title: catalog.title,
        priceMonth: catalog.priceMonth,
        priceYear: catalog.priceYear,
        features: JSON.stringify(catalog.features),
      };
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
