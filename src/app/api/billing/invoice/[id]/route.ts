import { NextResponse } from "next/server";
import PDFDocument from "pdfkit/js/pdfkit.standalone";

import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { getCatalogPlan } from "@/lib/subscriptions/catalog";

export const runtime = "nodejs";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(value);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function cleanFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function normalizeText(input: string | null | undefined, fallback = "-") {
  const value = String(input ?? "").trim();
  return value || fallback;
}

function detectPaymentMethod(paymentRef: string | null) {
  const ref = String(paymentRef ?? "").trim().toLowerCase();
  if (!ref) return "Online";
  if (ref.startsWith("sub_")) return "Razorpay Autopay";
  if (ref.startsWith("pay_") || ref.startsWith("order_")) return "Razorpay";
  if (ref.startsWith("txn")) return "PayU";
  return "Online";
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function invoiceStatusMeta(status: string | null | undefined) {
  const value = String(status ?? "").trim().toLowerCase();

  if (["active", "paid", "captured", "success", "charged"].includes(value)) {
    return {
      heading: "Paid Invoice",
      badgeText: "PAID",
      headingColor: "#22c55e",
      badgeBg: "#dcfce7",
      badgeTextColor: "#166534",
      amountLabel: "Amount Paid",
      filePrefix: "paid",
    };
  }

  if (["failed", "cancelled", "halted", "expired"].includes(value)) {
    return {
      heading: "Failed Invoice",
      badgeText: "FAILED",
      headingColor: "#ef4444",
      badgeBg: "#fee2e2",
      badgeTextColor: "#991b1b",
      amountLabel: "Attempted Amount",
      filePrefix: "failed",
    };
  }

  return {
    heading: "Invoice",
    badgeText: value ? value.toUpperCase() : "PENDING",
    headingColor: "#22c55e",
    badgeBg: "#e2e8f0",
    badgeTextColor: "#334155",
    amountLabel: "Amount Due",
    filePrefix: "invoice",
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const subscriptionId = Number(id);
    if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
      return NextResponse.json({ success: false, error: "Invalid invoice ID" }, { status: 400 });
    }

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: auth.userId,
        tenantId: auth.tenantId,
      },
      select: {
        id: true,
        planKey: true,
        status: true,
        billingCycle: true,
        amountPaid: true,
        paymentRef: true,
        createdAt: true,
        startedAt: true,
        endsAt: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const [tenant, user, dbPlan] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: {
          name: true,
          displayName: true,
          supportEmail: true,
          website: true,
          phone: true,
          billingAddress: true,
          taxId: true,
          invoicePrefix: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
          name: true,
          email: true,
        },
      }),
      prisma.subscriptionPlan.findUnique({
        where: { key: subscription.planKey },
        select: {
          title: true,
          priceMonth: true,
          priceYear: true,
        },
      }),
    ]);

    const catalogPlan = dbPlan ? null : getCatalogPlan(subscription.planKey);
    const unitAmount =
      subscription.billingCycle === "yearly"
        ? dbPlan?.priceYear ?? catalogPlan?.priceYear ?? dbPlan?.priceMonth ?? catalogPlan?.priceMonth ?? 0
        : dbPlan?.priceMonth ?? catalogPlan?.priceMonth ?? 0;

    const grossAmount = Math.max(
      0,
      Number(
        subscription.amountPaid ??
          unitAmount
      ) || 0
    );
    const gstRate = 18;
    const subtotal = grossAmount > 0 ? round2(grossAmount / (1 + gstRate / 100)) : 0;
    const taxAmount = grossAmount > 0 ? round2(grossAmount - subtotal) : 0;
    const total = round2(subtotal + taxAmount);

    const planTitle =
      normalizeText(dbPlan?.title, "") ||
      normalizeText(catalogPlan?.title, "") ||
      normalizeText(subscription.planKey);
    const tenantName = normalizeText(tenant?.displayName || tenant?.name, "Vaiket Client");
    const issuedToName = normalizeText(user?.name, "Workspace User");
    const issuedToEmail = normalizeText(user?.email, "-");
    const issuedFromName = "Vaiket Technologies";
    const issuedFromEmail = normalizeText(tenant?.supportEmail, "billing@vaiket.com");
    const issuedFromPhone = normalizeText(tenant?.phone, "+91 00000 00000");
    const issuedFromAddress = normalizeText(
      tenant?.billingAddress,
      "India"
    );
    const taxId = normalizeText(tenant?.taxId, "N/A");
    const paymentMethod = detectPaymentMethod(subscription.paymentRef);
    const invoicePrefix = normalizeText(tenant?.invoicePrefix, "VAI-INV");
    const invoiceNumber = `${invoicePrefix}-${subscription.id.toString().padStart(6, "0")}`;
    const website = normalizeText(tenant?.website, "https://app.vaiket.com");
    const billingCycleLabel = normalizeText(subscription.billingCycle, "monthly");
    const statusMeta = invoiceStatusMeta(subscription.status);
    const qty = 1;
    const lineTotal = round2(unitAmount * qty);

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        info: {
          Title: `${statusMeta.heading} ${invoiceNumber}`,
          Author: "Vaiket",
          Subject: "Subscription Invoice",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      doc.rect(0, 0, pageWidth, 112).fill("#211a47");
      doc.rect(0, 112, pageWidth, 4).fill("#14b8a6");

      doc.fillColor(statusMeta.headingColor).font("Helvetica-Bold").fontSize(34).text(statusMeta.heading, 38, 28);
      doc.roundedRect(198, 38, 108, 18, 9).fill(statusMeta.badgeBg);
      doc
        .fillColor(statusMeta.badgeTextColor)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(statusMeta.badgeText, 198, 43, { width: 108, align: "center" });
      doc
        .fillColor("#dbeafe")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("VAIKET", 42, 78);

      const rightX = 350;
      doc.fillColor("#67e8f9").font("Helvetica-Bold").fontSize(9).text("Invoice Number", rightX, 22);
      doc.fillColor("#e2e8f0").font("Helvetica").fontSize(10).text(invoiceNumber, rightX, 34);

      doc.fillColor("#67e8f9").font("Helvetica-Bold").fontSize(9).text("Payment Method", rightX + 118, 22);
      doc.fillColor("#e2e8f0").font("Helvetica").fontSize(10).text(paymentMethod, rightX + 118, 34);

      doc.fillColor("#67e8f9").font("Helvetica-Bold").fontSize(9).text(statusMeta.amountLabel, rightX, 52);
      doc.fillColor("#e2e8f0").font("Helvetica-Bold").fontSize(12).text(`INR ${formatMoney(total)}`, rightX, 64);

      doc.fillColor("#67e8f9").font("Helvetica-Bold").fontSize(9).text("Issue Date", rightX + 118, 52);
      doc.fillColor("#e2e8f0").font("Helvetica").fontSize(10).text(formatDate(subscription.createdAt), rightX + 118, 64);

      let y = 132;
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Billed from", 40, y);
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Billed to", 330, y);

      y += 16;
      doc.font("Helvetica").fontSize(9).fillColor("#334155");
      doc.text(issuedFromName, 40, y, { width: 250 });
      doc.text(tenantName, 330, y, { width: 225 });
      y += 12;
      doc.text(issuedFromAddress, 40, y, { width: 250 });
      doc.text(issuedToName, 330, y, { width: 225 });
      y += 12;
      doc.text(`GST/TAX: ${taxId}`, 40, y, { width: 250 });
      doc.text(issuedToEmail, 330, y, { width: 225 });
      y += 12;
      doc.text(`Email: ${issuedFromEmail}`, 40, y, { width: 250 });
      doc.text(`Phone: ${normalizeText(tenant?.phone, "-")}`, 330, y, { width: 225 });
      y += 12;
      doc.text(`Phone: ${issuedFromPhone}`, 40, y, { width: 250 });
      doc.text(`Cycle: ${billingCycleLabel}`, 330, y, { width: 225 });

      y += 24;
      doc.strokeColor("#111827").lineWidth(1).moveTo(40, y).lineTo(pageWidth - 40, y).stroke();
      y += 8;

      const colDescX = 40;
      const colUnitX = 320;
      const colQtyX = 410;
      const colTotalX = 500;
      const colWidth = 70;

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
      doc.text("Description", colDescX, y);
      doc.text("Unit cost", colUnitX, y, { width: colWidth, align: "right" });
      doc.text("Quantity", colQtyX, y, { width: colWidth, align: "right" });
      doc.text("Total", colTotalX, y, { width: colWidth, align: "right" });

      y += 12;
      doc.strokeColor("#94a3b8").lineWidth(0.6).moveTo(40, y).lineTo(pageWidth - 40, y).stroke();
      y += 8;

      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text(`${planTitle} (${billingCycleLabel})`, colDescX, y, { width: 255 });
      doc.text(`INR ${formatMoney(unitAmount)}`, colUnitX, y, { width: colWidth, align: "right" });
      doc.text(String(qty), colQtyX, y, { width: colWidth, align: "right" });
      doc.text(`INR ${formatMoney(lineTotal)}`, colTotalX, y, { width: colWidth, align: "right" });

      y += 18;
      doc.strokeColor("#cbd5e1").lineWidth(0.6).moveTo(40, y).lineTo(pageWidth - 40, y).stroke();

      const summaryX = 350;
      let sy = y + 16;
      doc.font("Helvetica").fontSize(10).fillColor("#0f172a");
      doc.text("Subtotal", summaryX, sy);
      doc.text(`INR ${formatMoney(subtotal)}`, summaryX + 130, sy, { width: 95, align: "right" });
      sy += 18;
      doc.text(`Taxes (${gstRate}%)`, summaryX, sy);
      doc.text(`INR ${formatMoney(taxAmount)}`, summaryX + 130, sy, { width: 95, align: "right" });
      sy += 18;
      doc.font("Helvetica-Bold").text("Total", summaryX, sy);
      doc.font("Helvetica-Bold").text(`INR ${formatMoney(total)}`, summaryX + 130, sy, {
        width: 95,
        align: "right",
      });
      sy += 14;
      doc.strokeColor("#0f172a").lineWidth(1).moveTo(summaryX, sy).lineTo(summaryX + 225, sy).stroke();

      doc.rect(0, pageHeight - 72, pageWidth, 72).fill("#1f2b5a");
      doc.fillColor("#22c55e").font("Helvetica-Bold").fontSize(10).text("Terms and conditions", 40, pageHeight - 55);
      doc
        .fillColor("#e2e8f0")
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "This invoice is system generated for subscription billing. Keep this document for accounting and tax purposes.",
          40,
          pageHeight - 41,
          { width: 355 }
        );
      doc
        .fillColor("#e2e8f0")
        .font("Helvetica")
        .fontSize(8)
        .text(website, pageWidth - 210, pageHeight - 26, { width: 170, align: "right" });

      doc.end();
    });

    const fileName = cleanFileName(`${statusMeta.filePrefix}_invoice_${invoiceNumber}.pdf`);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${fileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/billing/invoice/[id] failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate invoice PDF",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
