// src/app/api/payments/payu/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function verifyHash(post: any) {
  // PayU sends `status` and other fields. To verify:
  // serverHash = sha512(salt|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const salt = process.env.PAYU_SALT!;
  const key = process.env.PAYU_KEY!;

  const status = post.status || "";
  const txnid = post.txnid || "";
  const amount = post.amount || "";
  const productinfo = post.productinfo || "";
  const firstname = post.firstname || "";
  const email = post.email || "";

  const udf1 = post.udf1 || "";
  const udf2 = post.udf2 || "";
  const udf3 = post.udf3 || "";
  const udf4 = post.udf4 || "";
  const udf5 = post.udf5 || "";

  const postedHash = post.hash || "";

  const hashString = `${salt}|${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const computed = crypto.createHash("sha512").update(hashString).digest("hex");

  return { ok: computed === postedHash, computed, postedHash, hashString };
}

export async function POST(req: Request) {
  try {
    // PayU posts form-encoded (application/x-www-form-urlencoded). Next can read text then parse.
    const text = await req.text();
    const params = new URLSearchParams(text);
    const obj: any = {};
    for (const [k, v] of params) obj[k] = v;

    const { ok, computed, postedHash } = verifyHash(obj);

    // Update DB record (if exists)
    try {
      await prisma.payment.updateMany({
        where: { txnid: obj.txnid },
        data: {
          status: obj.status === "success" ? "SUCCESS" : "FAILURE",
          raw: obj,
        },
      });
    } catch (e) {
      console.warn("prisma update error", e);
    }

    if (!ok) {
      console.warn("Hash mismatch", { computed, postedHash });
      // Respond plain text (PayU expects 200)
      return new NextResponse("INVALID_HASH", { status: 200 });
    }

    // Final actions: mark subscription active, send receipt, etc.
    // TODO: add your business logic here

    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("payu webhook error", err);
    return new NextResponse("ERROR", { status: 500 });
  }
}
