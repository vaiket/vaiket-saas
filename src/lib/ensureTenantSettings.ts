import { prisma } from "@/lib/prisma";

export async function ensureTenantSettings(tenantId: number) {
  if (!tenantId) return;

  const exists = await prisma.tenantSettings.findUnique({
    where: { tenantId },
  });

  if (!exists) {
    console.log("⚙️ Creating default TenantSettings for tenant:", tenantId);

    await prisma.tenantSettings.create({
      data: {
        tenantId,
        aiPrimary: "Please write polite and helpful replies.",
        aiFallback: "Sorry, our team will contact you soon.",
        aiMode: "auto",
        aiModel: "gpt-4o-mini",
        autoReply: true,
        tone: "friendly"
      }
    });
  }
}
