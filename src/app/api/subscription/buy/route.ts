import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // ✅ Always resolve correct HTTPS origin
    const origin = new URL(req.headers.get("referer") || "").origin;

    // ✅ Get auth
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

    const { user } = await authRes.json();

    if (!user?.id || !user?.tenantId) {
      return NextResponse.json(
        { success: false, error: "Invalid user" },
        { status: 400 }
      );
    }

    // ✅ Payment info
    const txnid = "TXN_" + Date.now();
    const amount = "9"; // ✅ SAME everywhere

    await prisma.payment.create({
      data: {
        txnid,
        tenantId: user.tenantId,
        userId: user.id,
        product: "BASIC_999",
        amount: Number(amount),
        status: "CREATED",
      },
    });

    // ✅ PayU hash
    const key = process.env.PAYU_KEY!;
    const salt = process.env.PAYU_SALT!;
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

    // ✅ Return PayU data
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
