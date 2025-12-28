import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1️⃣ Resolve origin safely
    const { origin } = new URL(req.url);

    // 2️⃣ Get auth context
    const authRes = await fetch(`${origin}/api/auth/me`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    if (!authRes.ok) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const auth = await authRes.json();
    const user = auth.user;

    if (!user?.id || !user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Invalid user context" },
        { status: 400 }
      );
    }

    // 3️⃣ Create payment (NO provider field)
    const txnid = "TXN_" + Date.now();

    await prisma.payment.create({
      data: {
        txnid,
        tenantId: user.tenantId,
        userId: user.id,
        product: "BASIC_999",
        amount: 999,
        status: "CREATED",
      },
    });

    // 4️⃣ PayU hash
    const key = process.env.PAYU_KEY!;
    const salt = process.env.PAYU_SALT!;
    const amount = "10";
    const productinfo = "Email Automation Plan";
    const firstname = user.email.split("@")[0];
    const email = user.email;

    const hashString =
      `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}` +
      "|||||||||||" +
      salt;

    const hash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    // 5️⃣ Response to frontend
    return NextResponse.json({
      success: true,
      payuUrl: process.env.PAYU_GATEWAY_URL,
      fields: {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: "9999999999",
        surl: `${origin}/api/payment/payu/success`,
        furl: `${origin}/api/payment/payu/failure`,
        hash,
      },
    });
  } catch (err) {
    console.error("❌ Buy API Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
