import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    const merchant_id = process.env.PHONEPE_MERCHANT_ID!;
    const secret = process.env.PHONEPE_CLIENT_SECRET!;

    const path = `/pg/v1/status/${merchant_id}/${transactionId}`;

    const checksum = crypto
      .createHash("sha256")
      .update(path + secret)
      .digest("hex") + "###1";

    const res = await fetch(`https://api.phonepe.com/apis/hermes${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchant_id
      }
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, data });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
