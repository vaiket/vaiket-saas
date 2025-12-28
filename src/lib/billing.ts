// lib/billing.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
;

export async function consumeResponse(tenantId: number, count = 1) {
  // Atomically increment responses_used if remaining available
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) throw new Error('No subscription found');

  const remaining = sub.responses_allowed - sub.responses_used;
  if (remaining < count) throw new Error('Response limit exceeded');

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ responses_used: sub.responses_used + count, updated_at: new Date().toISOString() })
    .eq('id', sub.id);

  if (error) throw error;

  return { allowed: sub.responses_allowed, used: sub.responses_used + count, remaining: remaining - count };
}
