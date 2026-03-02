import { prisma } from "@/lib/prisma";
import type { ProductKey } from "@/lib/subscriptions/products";

export async function hasActiveProductSubscription(
  _userId: number,
  tenantId: number,
  product: ProductKey
) {
  const now = new Date();

  const active = await prisma.userSubscription.findFirst({
    where: {
      tenantId,
      planKey: { startsWith: `${product}_` },
      status: "active",
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      ],
    },
    orderBy: [{ endsAt: "desc" }, { createdAt: "desc" }],
  });

  return Boolean(active);
}
