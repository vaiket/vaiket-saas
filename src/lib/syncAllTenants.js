import { prisma } from "../lib/prisma.js";
import { syncImapForTenant } from "../lib/syncImapForTenant.js";
import { runAiAutoReply } from "../lib/runAiAutoReply.js";

export async function syncAllTenants() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true }
  });

  let results = [];

  for (const t of tenants) {
    const tenantId = t.id;

    const imapRes = await syncImapForTenant(tenantId);
    const aiRes = await runAiAutoReply(tenantId);

    results.push({
      tenantId,
      result: {
        imapRes,
        aiRes
      }
    });
  }

  return { ok: true, results };
}
