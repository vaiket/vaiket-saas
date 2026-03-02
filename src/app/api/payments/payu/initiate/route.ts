// app/api/payments/payu/initiate/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
;
import crypto from "crypto";

const PAYU_KEY = process.env.PAYU_KEY!;
const PAYU_SALT = process.env.PAYU_SALT!;
const PAYU_GATEWAY_URL = process.env.PAYU_GATEWAY_URL!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, productinfo, firstname, email, phone, userId, tenantId } = body;

    console.log("REQUEST BODY:", body);

    // 1) Insert pending transaction
    console.log("Inserting into transactions...");
    const { data: tx, error: err } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId || null,
        tenant_id: tenantId || null,
        plan_key: productinfo,
        amount,
        status: "pending",
      })
      .select("*")
      .single();

    console.log("TX DATA:", tx);
    console.log("TX ERROR:", err);

    if (err) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 500 }
      );
    }

    // 2) PayU txnid (unique)
    const txnid = "TXN" + tx.id + Date.now();

    // 3) PayU Hash string
    const hashString =
      `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;

    const hash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    console.log("HASH:", hash);

    // 4) Auto-submit HTML to redirect user
    const payuForm = `
      <html>
        <body onload="document.forms[0].submit()">
          <form action="${PAYU_GATEWAY_URL}" method="post">
            <input type="hidden" name="key" value="${PAYU_KEY}" />
            <input type="hidden" name="txnid" value="${txnid}" />
            <input type="hidden" name="amount" value="${amount}" />
            <input type="hidden" name="productinfo" value="${productinfo}" />
            <input type="hidden" name="firstname" value="${firstname}" />
            <input type="hidden" name="email" value="${email}" />
            <input type="hidden" name="phone" value="${phone}" />
            <input type="hidden" name="surl" value="https://yourdomain.com/api/payments/payu/success" />
            <input type="hidden" name="furl" value="https://yourdomain.com/api/payments/payu/fail" />
            <input type="hidden" name="hash" value="${hash}" />
          </form>
          <p>Redirecting to PayU secure payment...</p>
        </body>
      </html>
    `;

    return NextResponse.json({
      ok: true,
      html: payuForm,
      txnid,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
