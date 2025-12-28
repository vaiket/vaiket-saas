// src/lib/runTenantSync.ts
import { runImapSync } from "@/lib/runImap";
import { autoReplyScan } from "@/lib/aiAutoReplyScan";

/**
 * Run tenant sync pipeline:
 * 1) run IMAP sync
 * 2) run AI auto-reply
 */
export async function runTenantSync(tenantId: number) {
  const imapRes = await runImapSync(tenantId).catch((e) => ({ ok: false, error: e }));
  const aiRes = await autoReplyScan(tenantId).catch((e) => ({ ok: false, error: e }));
  return { imapRes, aiRes };
}
