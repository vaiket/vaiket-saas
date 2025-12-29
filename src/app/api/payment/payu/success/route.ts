import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const txnid = body.get("txnid") as string;
    const status = body.get("status") as string;
    const amount = body.get("amount") as string;
    const productinfo = body.get("productinfo") as string;
    const firstname = body.get("firstname") as string;
    const email = body.get("email") as string;
    const receivedHash = body.get("hash") as string;

    if (!txnid || !status) {
      return Response.redirect(
        new URL("/dashboard/Subscriptions?payment=error", req.url),
        303
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { txnid },
    });

    if (!payment) {
      return Response.redirect(
        new URL("/dashboard/Subscriptions?payment=error", req.url),
        303
      );
    }

    // ✅ Verify PayU hash
    const salt = process.env.PAYU_SALT!;
    const key = process.env.PAYU_KEY!;

    const hashString =
      `${salt}|${status}|||||||||||` +
      `${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

    const expectedHash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    if (expectedHash !== receivedHash) {
      await prisma.payment.update({
        where: { txnid },
        data: {
          status: "FAILED",
          raw: Object.fromEntries(body.entries()),
        },
      });

      return Response.redirect(
        new URL("/dashboard/Subscriptions?payment=failed", req.url),
        303
      );
    }

    // ✅ Mark payment success
    await prisma.payment.update({
      where: { txnid },
      data: {
        status: "SUCCESS",
        raw: Object.fromEntries(body.entries()),
      },
    });

    // ✅ SAFE subscription logic (NO upsert)
    const existing = await prisma.userSubscription.findFirst({
      where: {
        tenantId: payment.tenantId!,
        planKey: payment.product!,
      },
    });

    const now = new Date();
    const endsAt = new Date();
    endsAt.setDate(now.getDate() + 30);

    if (existing) {
      await prisma.userSubscription.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          endsAt,
        },
      });
    } else {
      await prisma.userSubscription.create({
        data: {
          tenantId: payment.tenantId!,
          userId: payment.userId!,
          planKey: payment.product!,
          status: "ACTIVE",
          startedAt: now,
          endsAt,
          amountPaid: payment.amount,
        },
      });
    }

    // ✅ FINAL REDIRECT (SAFE)
    return Response.redirect(
      new URL("/dashboard/email-management", req.url),
      303
    );
  } catch (err) {
    console.error("PAYU SUCCESS ERROR:", err);

    return Response.redirect(
      new URL("/dashboard/Subscriptions?payment=error", req.url),
      303
    );
  }
}
