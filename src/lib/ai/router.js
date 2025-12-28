export async function aiRouter(tenantId, type="reply") {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId }
  });

  const primary = settings.aiPrimary;  // "deepseek"
  const fallback = settings.aiFallback?.split(",") || [];

  const sequence = [primary, ...fallback];  // e.g. ["deepseek","openai","gemini"]

  return sequence;  // router returns attempt order
}
