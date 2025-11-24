// ✅ src/app/api/payments/payu/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PDFDocument from "pdfkit";

type PayuBody = {
  status: string;
  mihpayid?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  udf1?: string;
  custom_user_id?: string;
  custom_tenant_id?: string;
};

async function verifyPayuHash(_body: PayuBody): Promise<boolean> {
  return true; // TODO: implement PayU hash verification later
}

// ✅ Generate invoice buffer — NO get-stream
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
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text(process.env.SITE_NAME || "Vaiket AI");
    doc.moveDown();
    doc.fontSize(14).text(`Invoice ID: ${transactionId}`);
    doc.text(`Tenant ID: ${tenantId}`);
    doc.text(`Plan: ${planKey}`);
    doc.text(`Amount: ₹${amount}`);
    doc.text(`Date: ${date}`);
    doc.moveDown();
    doc.text("Thank you for your purchase!", { align: "center" });

    doc.end();
  });
}

const responsesMap = {
  basic: { monthly: 1250, yearly: 15000 },
  popular: { monthly: 3250, yearly: 100000 },
  pro: { monthly: 4000, yearly: 999999999 },
} as const;

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = Object.fromEntries(
      new URLSearchParams(raw)
    ) as unknown as PayuBody;

    const valid = await verifyPayuHash(body);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid hash" }, { status: 400 });
    }

    const status = body.status?.toLowerCase() ?? "failure";
    const amount = body.amount ? Number(body.amount) : 0;

    const userId = body.custom_user_id ? Number(body.custom_user_id) : undefined;
    const tenantId = body.custom_tenant_id ? Number(body.custom_tenant_id) : undefined;

    const pi = (body.productinfo || "").toLowerCase();
    let planKey: keyof typeof responsesMap = "basic";
    if (pi.includes("popular")) planKey = "popular";
    if (pi.includes("pro")) planKey = "pro";

    const billingPeriod: "monthly" | "yearly" =
      body.udf1 === "yearly" ? "yearly" : "monthly";

    const responsesAllowed = responsesMap[planKey][billingPeriod];

    const { data: tx, error: txErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId ?? null,
        tenant_id: tenantId ?? null,
        plan_key: planKey,
        amount,
        mihpayid: body.mihpayid ?? null,
        status,
        payment_mode: "payu",
      })
      .select("*")
      .single();

    if (txErr) console.error("Transaction insert error", txErr);

    if (status === "success") {
      const now = new Date();
      const endDate = new Date(now);

      if (billingPeriod === "monthly") endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      const { error: subErr } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId ?? null,
        tenant_id: tenantId ?? null,
        plan_key: planKey,
        billing_period: billingPeriod,
        status: "active",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        responses_allowed: responsesAllowed,
        responses_used: 0,
        renewal_amount: amount,
      });

      if (subErr) console.error("Subscription insert error", subErr);

      try {
        const pdfBuffer = await generateInvoicePdfBuffer({
          transactionId: tx?.id ?? body.txnid ?? body.mihpayid ?? "txn",
          tenantId: tenantId ?? 0,
          amount,
          planKey,
          date: now.toISOString(),
        });

        const fileName = `invoice_${tx?.id ?? Date.now()}.pdf`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(process.env.INVOICE_BUCKET || "billing-invoices")
          .upload(fileName, pdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadErr) {
          console.error("Invoice upload error", uploadErr);
        } else {
          const { data } = supabaseAdmin.storage
            .from(process.env.INVOICE_BUCKET || "billing-invoices")
            .getPublicUrl(fileName);

          const publicUrl = data.publicUrl;

          if (publicUrl) {
            await supabaseAdmin
              .from("transactions")
              .update({ invoice_url: publicUrl })
              .eq("id", tx?.id);

            await supabaseAdmin
              .from("invoices")
              .insert({
                transaction_id: tx?.id ?? null,
                tenant_id: tenantId ?? null,
                invoice_url: publicUrl,
                amount,
              });
          }
        }
      } catch (pdfErr) {
        console.error("Invoice PDF error", pdfErr);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("PayU callback error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
