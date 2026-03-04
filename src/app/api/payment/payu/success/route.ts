import crypto from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function normalizePlanKey(rawValue: string | null | undefined) {
  const input = String(rawValue ?? "").trim().toLowerCase();
  if (!input) return "core_starter";

  if (input.startsWith("core_") || input.startsWith("whatsapp_")) {
    return input;
  }

  if (input === "basic_999" || input === "automation_plan") {
    return "core_starter";
  }

  return "core_starter";
}

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const txnid = String(body.get("txnid") ?? "").trim();
    const statusRaw = String(body.get("status") ?? "").trim();
    const amountRaw = String(body.get("amount") ?? "").trim();
    const amount = Number(amountRaw || "0");
    const productinfo = String(body.get("productinfo") ?? "").trim();
    const firstname = String(body.get("firstname") ?? "").trim();
    const email = String(body.get("email") ?? "").trim();
    const receivedHash = String(body.get("hash") ?? "").trim();

    if (!txnid || !statusRaw) {
      return NextResponse.redirect(
        new URL("/dashboard/billing?payment=error", req.url),
        303
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { txnid },
    });

    if (!payment) {
      return NextResponse.redirect(
        new URL("/dashboard/billing?payment=error", req.url),
        303
      );
    }

    const salt = process.env.PAYU_SALT!;
    const key = process.env.PAYU_KEY!;
    const hashString =
      `${salt}|${statusRaw}|||||||||||` +
      `${email}|${firstname}|${productinfo}|${amountRaw}|${txnid}|${key}`;

    const expectedHash = crypto.createHash("sha512").update(hashString).digest("hex");

    if (expectedHash !== receivedHash) {
      await prisma.payment.update({
        where: { txnid },
        data: {
          status: "FAILED",
          raw: Object.fromEntries(body.entries()),
        },
      });

      return NextResponse.redirect(
        new URL("/dashboard/billing?payment=failed", req.url),
        303
      );
    }

    if (statusRaw.toLowerCase() !== "success") {
      await prisma.payment.update({
        where: { txnid },
        data: {
          status: "FAILED",
          raw: Object.fromEntries(body.entries()),
        },
      });

      return NextResponse.redirect(
        new URL("/dashboard/billing?payment=failed", req.url),
        303
      );
    }

    await prisma.payment.update({
      where: { txnid },
      data: {
        status: "SUCCESS",
        raw: Object.fromEntries(body.entries()),
      },
    });

    const normalizedPlanKey = normalizePlanKey(payment.product);
    const existing = await prisma.userSubscription.findFirst({
      where: {
        tenantId: payment.tenantId!,
        planKey: normalizedPlanKey,
      },
    });

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + 30);

    if (existing) {
      await prisma.userSubscription.update({
        where: { id: existing.id },
        data: {
          status: "active",
          startedAt: now,
          endsAt,
          amountPaid: Number.isFinite(amount) ? amount : existing.amountPaid,
        },
      });
    } else {
      await prisma.userSubscription.create({
        data: {
          tenantId: payment.tenantId!,
          userId: payment.userId!,
          planKey: normalizedPlanKey,
          status: "active",
          startedAt: now,
          endsAt,
          amountPaid: Number.isFinite(amount) ? amount : payment.amount,
        },
      });
    }

    return NextResponse.redirect(new URL("/dashboard/billing?payment=success", req.url), 303);
  } catch (err) {
    console.error("PayU success error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/billing?payment=error", req.url),
      303
    );
  }
}
