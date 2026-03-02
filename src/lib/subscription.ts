import { prisma } from "@/lib/prisma";

export async function isAutomationActive(tenantId: number) {
  const sub = await prisma.tenantSubscription.findFirst({
    where: {
      tenantId,
      product: "automation",
      status: "active",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  return !!sub;
}
