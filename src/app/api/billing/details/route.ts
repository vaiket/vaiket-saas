// app/api/billing/details/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = Number(url.searchParams.get('tenantId'));
    if (!tenantId) return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    const usage = subscription ? {
      allowed: subscription.responses_allowed,
      used: subscription.responses_used,
      remaining: Math.max(0, subscription.responses_allowed - subscription.responses_used),
      end_date: subscription.end_date,
    } : null;

    return NextResponse.json({ ok: true, subscription, transactions, invoices, usage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}
