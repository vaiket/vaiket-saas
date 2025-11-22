import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();

    const secret = process.env.PHONEPE_CLIENT_SECRET!;
    const checksumHeader = req.headers.get("x-verify");

    const calculatedHash = crypto
      .createHash("sha256")
      .update(bodyText + secret)
      .digest("hex") + "###1";

    if (checksumHeader !== calculatedHash) {
      return NextResponse.json({ ok: false, error: "Invalid checksum" }, { status: 400 });
    }

    const data = JSON.parse(bodyText);
    const info = data.data;

    if (info.code === "PAYMENT_SUCCESS") {
      await prisma.userSubscription.updateMany({
        where: { paymentRef: info.transactionId },
        data: { status: "active" },
      });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
