import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { amount, plan } = await req.json();

    if (!amount) {
      return NextResponse.json({ success: false, error: "Amount missing" }, { status: 400 });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID!;
    const clientId = process.env.PHONEPE_CLIENT_ID!;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET!;
    const baseUrl = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

    const orderId = "VAIKET_" + Date.now();

    const payload = {
      merchantId,
      merchantTransactionId: orderId,
      merchantUserId: "USER_" + orderId,
      amount: amount * 100, // convert to paise
      redirectUrl: `https://vaiket.com/payment/success`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://vaiket.com/api/phonepe/verify?orderId=${orderId}`,
      mobileNumber: "9999999999",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");

    const checksum = crypto
      .createHash("sha256")
      .update(payloadBase64 + "/pg/v1/pay" + clientSecret)
      .digest("hex") + "###1";

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchantId,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const result = await response.json();

    if (!result?.data?.instrumentResponse?.redirectInfo?.url) {
      return NextResponse.json(
        { success: false, error: "PhonePe did not return redirect URL", raw: result },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      redirectUrl: result.data.instrumentResponse.redirectInfo.url,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
