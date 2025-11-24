import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
;
;

const PAYU_KEY = process.env.PAYU_KEY!;
const PAYU_SALT = process.env.PAYU_SALT!;

/**
 * This route is triggered by PayU after a successful payment.
 * It MUST verify the PayU response hash.
 * Then update the transaction & activate subscription.
 */

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const status = formData.get("status");
    const txnid = formData.get("txnid");
    const amount = formData.get("amount");
    const productinfo = formData.get("productinfo");
    const firstname = formData.get("firstname");
    const email = formData.get("email");
    const mihpayid = formData.get("mihpayid"); // PayU payment ID
    const payuMoneyId = formData.get("payuMoneyId");

    const received_hash = formData.get("hash");

    // Step 1 — RECREATE HASH TO VERIFY
    const hashString =
      `${PAYU_SALT}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${PAYU_KEY}`;

    const calculated_hash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    if (calculated_hash !== received_hash) {
      console.log("HASH MISMATCH");
      return NextResponse.json(
        { ok: false, error: "Hash verification failed" },
        { status: 400 }
      );
    }

    console.log("HASH VERIFIED ✔");

    // Step 2 — UPDATE TRANSACTION (mark success)
    const { data: txUpdate, error: txErr } = await supabaseAdmin
      .from("transactions")
      .update({
        status: "success",
        payu_txn_id: mihpayid,
        payu_order_id: payuMoneyId,
        updated_at: new Date().toISOString(),
      })
      .eq("plan_key", productinfo)
      .eq("amount", amount)
      .eq("status", "pending") // ensure pending transaction only
      .select("*");

    console.log("TX UPDATED:", txUpdate);

    // Step 3 — Activate subscription for tenant/user
    if (txUpdate && txUpdate.length > 0) {
      const tx = txUpdate[0];

      await supabaseAdmin.from("subscriptions").insert({
        user_id: tx.user_id,
        tenant_id: tx.tenant_id,
        plan_key: tx.plan_key,
        status: "active",
        amount_paid: tx.amount,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    // Step 4 — Redirect user back to dashboard
    return NextResponse.redirect("https://yourdomain.com/dashboard/billing");

  } catch (e: any) {
    console.log("SUCCESS ROUTE ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
