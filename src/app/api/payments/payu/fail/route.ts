import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const txnid = formData.get("txnid");
    const error_Message = formData.get("error_Message");
    const amount = formData.get("amount");
    const productinfo = formData.get("productinfo");
    const mihpayid = formData.get("mihpayid"); // PayU payment ID

    console.log("FAILURE CALLED =>", {
      txnid,
      amount,
      productinfo,
      mihpayid,
      error_Message,
    });

    // 1) Update transaction status to FAILED
    const { data: updatedTx, error: txErr } = await supabaseAdmin
      .from("transactions")
      .update({
        status: "failed",
        payu_txn_id: mihpayid || null,
        updated_at: new Date().toISOString(),
      })
      .eq("amount", amount)
      .eq("plan_key", productinfo)
      .eq("status", "pending") // only pending ones should fail
      .select("*");

    if (txErr) {
      console.log("TX UPDATE FAIL:", txErr);
    } else {
      console.log("TX FAILED UPDATED:", updatedTx);
    }

    // 2) Redirect user back to billing page with fail notice
    return NextResponse.redirect(
      "https://yourdomain.com/dashboard/billing?payment=failed"
    );

  } catch (e: any) {
    console.log("FAIL ROUTE ERROR =>", e);

    return NextResponse.json(
      { ok: false, error: e.message || "Payment failure error" },
      { status: 500 }
    );
  }
}
