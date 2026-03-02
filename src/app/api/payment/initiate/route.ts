import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { planKey, userId, tenantId } = await req.json();

    // For test mode → static fake prices
    const planPrices: any = {
      starter: 99900,
      growth: 299900,
      business: 999900,
    };

    if (!planPrices[planKey]) {
      return NextResponse.json(
        { ok: false, error: "Invalid planKey" },
        { status: 400 }
      );
    }

    // ----- TEST MODE CONFIG -----
    const merchantId = process.env.PHONEPE_MERCHANT_ID!;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET!;
    const base = process.env.BASE_URL!;

    // Test Mode Endpoint
    const endpoint = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";

    // Create payment payload
    const payload = {
      merchantId,
      merchantTransactionId: "TXN_" + Date.now(),
      merchantUserId: userId || "test_user",
      amount: planPrices[planKey],
      redirectUrl: `${base}/payment/success?tid=${tenantId}`,
      callbackUrl: `${base}/api/payment/webhook`,
      paymentInstrument: { type: "PAY_PAGE" }
    };

    // PhonePe requires base64 payload
    const payloadString = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadString).toString("base64");

    // Checksum = sha256(payload + API_PATH + secretKey) + ###1
    const apiPath = "/pg/v1/pay";

    const checksum = crypto
      .createHash("sha256")
      .update(payloadBase64 + apiPath + clientSecret)
      .digest("hex") + "###1";

    // Send request to PhonePe
    const phonePeRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await phonePeRes.json();

    console.log("PHONEPE (TEST MODE) RAW:", data);

    // EXPECTED TEST MODE SUCCESS:
    // data.data.instrumentResponse.redirectInfo.url

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error("PHONEPE TEST ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
