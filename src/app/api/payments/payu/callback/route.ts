// app/api/payments/payu/callback/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

type PayuBody = {
  status: string;
  mihpayid?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  hash?: string;
  // You may receive custom params: custom_user_id, custom_tenant_id etc.
  custom_user_id?: string;
  custom_tenant_id?: string;
  udf1?: string;
};

async function verifyPayuHash(body: PayuBody): Promise<boolean> {
  // TODO: Implement PayU hash verification according to PayU docs.
  // This is a placeholder that returns true only for demonstration.
  // Use PAYU_SALT and follow PayU's hash algorithm: https://docs.payu.in/
  const PAYU_SALT = process.env.PAYU_SALT || '';
  if (!PAYU_SALT) return false;
  // Implement actual verification here.
  return true;
}

async function generateInvoicePdfBuffer({
  transactionId,
  tenantId,
  amount,
  planKey,
  date,
}: {
  transactionId: string | number;
  tenantId: string | number;
  amount: number | string;
  planKey: string;
  date: string;
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.fontSize(20).text(process.env.SITE_NAME || 'Vaiket AI', { align: 'left' });
  doc.moveDown();
  doc.fontSize(14).text(`Invoice: ${transactionId}`);
  doc.text(`Tenant ID: ${tenantId}`);
  doc.text(`Plan: ${planKey}`);
  doc.text(`Amount: ₹${amount}`);
  doc.text(`Date: ${date}`);
  doc.moveDown();
  doc.text('Thank you for your purchase!', { align: 'center' });
  doc.end();

  const buffer = await getStream.buffer(doc as any);
  return buffer;
}

export async function POST(req: Request) {
  try {
    const body = Object.fromEntries(new URLSearchParams(await req.text())) as unknown as PayuBody;
    // If PayU posts as JSON, use: const body = await req.json();

    // 1) Verify hash
    const valid = await verifyPayuHash(body);
    if (!valid) {
      console.error('Invalid PayU hash', body);
      return NextResponse.json({ ok: false, error: 'Invalid hash' }, { status: 400 });
    }

    // 2) Interpret payload
    const status = body.status?.toLowerCase() || 'failure';
    const mihpayid = body.mihpayid || null;
    const txnid = body.txnid || null;
    const amount = body.amount ? Number(body.amount) : 0;
    const productinfo = body.productinfo || '';
    const userId = body.custom_user_id ? Number(body.custom_user_id) : undefined;
    const tenantId = body.custom_tenant_id ? Number(body.custom_tenant_id) : undefined;
    // Fallback: you used localStorage userId/tenantId during initiate; ensure PayU returns them via udf/custom fields.

    // 3) Insert transaction
    const { data: tx, error: txErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId || null,
        tenant_id: tenantId || null,
        plan_key: productinfo?.split(' ')[1] || productinfo || 'unknown',
        amount: amount,
        mihpayid: mihpayid,
        status: status,
        payment_mode: 'payu',
      })
      .select('*')
      .single();

    if (txErr) {
      console.error('Transaction insert error', txErr);
      // continue — still respond 200 to PayU to avoid retries? depends on PayU requirements.
    }

    // 4) On success => create/update subscription
    if (status === 'success' || status === 'success') {
      // Determine plan_key & billing_period from productinfo or other fields
      let planKey = (productinfo || '').toLowerCase().includes('basic') ? 'basic'
        : (productinfo || '').toLowerCase().includes('pro') ? 'pro'
        : (productinfo || '').toLowerCase().includes('popular') ? 'popular' : 'basic';

      // Decide billing period by amount or a param — ensure PayU send `udf1` or similar
      const billingPeriod = body.udf1 === 'yearly' ? 'yearly' : 'monthly';

      // responses_allowed mapping:
      const responsesMap: Record<string, { monthly: number; yearly: number }> = {
        basic: { monthly: 1250, yearly: 15000 },
        popular: { monthly: 3250, yearly: 100000 },
        pro: { monthly: 4000, yearly: 999999999 },
      };
      const responsesAllowed = billingPeriod === 'yearly' ? responsesMap[planKey].yearly : responsesMap[planKey].monthly;

      // Upsert subscription logic:
      // If there is an active subscription for this tenant_id, extend end_date; otherwise create new.
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now);
      if (billingPeriod === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      // Find existing subscription
      const { data: existing, error: exErr } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exErr) console.error('Subs lookup err', exErr);

      if (existing && existing.status === 'active') {
        // extend: set end_date = max(existing.end_date, now) + period
        const currentEnd = new Date(existing.end_date);
        const base = currentEnd > now ? currentEnd : now;
        if (billingPeriod === 'monthly') base.setMonth(base.getMonth() + 1);
        else base.setFullYear(base.getFullYear() + 1);

        const { error: updErr } = await supabaseAdmin
          .from('subscriptions')
          .update({
            end_date: base.toISOString(),
            responses_allowed: responsesAllowed,
            responses_used: 0,
            renewal_amount: amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updErr) console.error('Subs update err', updErr);
      } else {
        // create new subscription
        const { error: insErr } = await supabaseAdmin.from('subscriptions').insert({
          user_id: userId || null,
          tenant_id: tenantId || null,
          plan_key: planKey,
          billing_period: billingPeriod,
          status: 'active',
          start_date: startDate,
          end_date: endDate.toISOString(),
          responses_allowed: responsesAllowed,
          responses_used: 0,
          renewal_amount: amount,
        });

        if (insErr) console.error('Subs insert err', insErr);
      }

      // 5) Generate invoice PDF and save to Supabase storage
      try {
        const buffer = await generateInvoicePdfBuffer({
          transactionId: tx?.id ?? txnid ?? mihpayid ?? 'txn',
          tenantId: tenantId ?? 0,
          amount,
          planKey,
          date: new Date().toISOString(),
        });

        const fileName = `invoice_${tx?.id ?? mihpayid ?? Date.now()}.pdf`;
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from(process.env.INVOICE_BUCKET || 'billing-invoices')
          .upload(fileName, buffer, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadErr) {
          console.error('Invoice upload err', uploadErr);
        } else {
          // get public URL or signed URL
          const { publicURL } = supabaseAdmin.storage
            .from(process.env.INVOICE_BUCKET || 'billing-invoices')
            .getPublicUrl(fileName);

          // save invoice record
          await supabaseAdmin.from('invoices').insert({
            transaction_id: tx?.id ?? null,
            tenant_id: tenantId ?? null,
            invoice_url: publicURL,
            amount,
          });

          // update transaction with invoice_url
          await supabaseAdmin
            .from('transactions')
            .update({ invoice_url: publicURL })
            .eq('id', tx?.id);
        }
      } catch (pdfErr) {
        console.error('Invoice generation error', pdfErr);
      }
    }

    // 6) Return success HTML so payment gateway knows we consumed callback
    // Some gateways require 200 plain text/html
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Callback error', err);
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500 });
  }
}
