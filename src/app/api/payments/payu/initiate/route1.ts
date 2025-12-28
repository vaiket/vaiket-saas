// src/app/api/payments/payu/initiate/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma"; // optional - if you want to save payment in DB

type ReqBody = {
  amount: number | string; // Rupee amount or paise
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  tenantId?: number;
  userId?: number;
};

function toPaise(amount: number | string) {
  // If user passes 999 -> treat as 999 INR -> convert to paise 99900
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) throw new Error("Invalid amount");
  // Use paise integer
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json();

    const key = process.env.PAYU_KEY!;
    const salt = process.env.PAYU_SALT!;
    const gateway = process.env.PAYU_GATEWAY_URL!;
    const success = process.env.PAYU_SUCCESS_URL!;
    const failure = process.env.PAYU_FAILURE_URL!;

    if (!key || !salt || !gateway) {
      return NextResponse.json({ ok: false, error: "PAYU not configured" }, { status: 500 });
    }

    const amountPaise = toPaise(body.amount || 0); // int paise
    const amountRupeeStr = (amountPaise / 100).toFixed(2); // e.g., "999.00"

    const txnid = `TXN${Date.now()}${Math.floor(Math.random() * 900)}`;

    const productinfo = body.productinfo || "Vaiket Subscription";
    const firstname = body.firstname || "User";
    const email = body.email || "customer@example.com";
    const phone = body.phone || "";

    // PayU expects amount in Rupees as string (like "999.00")
    const amountStr = amountRupeeStr;

    // UDFs (optional user defined fields)
    const udf1 = "";
    const udf2 = "";
    const udf3 = "";
    const udf4 = "";
    const udf5 = "";

    // PayU hash string:
    // hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1|...|udf5|salt)
    const hashString = `${key}|${txnid}|${amountStr}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    // Optionally save initiated payment to DB
    try {
      await prisma?.payment.create({
        data: {
          txnid,
          tenantId: body.tenantId ?? null,
          userId: body.userId ?? null,
          amount: amountPaise,
          product: productinfo,
          status: "INITIATED",
          raw: { txnid, amountPaise },
        },
      });
    } catch (e) {
      // If prisma not configured, ignore
      console.warn("prisma save failed", e);
    }

    // Build auto-submit HTML form to redirect user to PayU
    const html = `
      <!doctype html>
      <html>
        <head><meta charset="utf-8"><title>Redirecting to PayU...</title></head>
        <body onload="document.forms[0].submit()">
          <form action="${gateway}" method="post">
            <input type="hidden" name="key" value="${key}" />
            <input type="hidden" name="txnid" value="${txnid}" />
            <input type="hidden" name="amount" value="${amountStr}" />
            <input type="hidden" name="productinfo" value="${productinfo}" />
            <input type="hidden" name="firstname" value="${firstname}" />
            <input type="hidden" name="email" value="${email}" />
            <input type="hidden" name="phone" value="${phone}" />
            <input type="hidden" name="surl" value="${success}" />
            <input type="hidden" name="furl" value="${failure}" />
            <input type="hidden" name="hash" value="${hash}" />
            <!-- optional UDFs -->
            <input type="hidden" name="udf1" value="${udf1}" />
            <input type="hidden" name="udf2" value="${udf2}" />
            <input type="hidden" name="udf3" value="${udf3}" />
            <input type="hidden" name="udf4" value="${udf4}" />
            <input type="hidden" name="udf5" value="${udf5}" />
            <noscript>
              <p>Redirecting to payment gateway. Click the button if not redirected.</p>
              <button type="submit">Proceed to Pay</button>
            </noscript>
          </form>
        </body>
      </html>
    `;

    // Return HTML string to client; client will open and write it (no atob)
    return NextResponse.json({ ok: true, html });
  } catch (err: any) {
    console.error("PayU initiate error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
