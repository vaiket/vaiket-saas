import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.formData();
  const txnid = body.get("txnid") as string;

  if (txnid) {
    await prisma.payment.update({
      where: { txnid },
      data: {
        status: "FAILED",
        raw: Object.fromEntries(body.entries()),
      },
    });
  }

  return NextResponse.redirect(
    new URL("/dashboard/Subscriptions?payment=failed", req.url)
  );
}
