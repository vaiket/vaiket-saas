import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();

  const txnid = form.get("txnid");
  const status = form.get("status");
  const amount = form.get("amount");
  const mihpayid = form.get("mihpayid");
  const email = form.get("email");

  // Save to DB here (optional)
  // await prisma.payment.create(...)

  return NextResponse.json({
    ok: true,
    message: "PayU LIVE Callback Received",
    data: {
      txnid,
      status,
      amount,
      mihpayid,
      email,
    },
  });
}
