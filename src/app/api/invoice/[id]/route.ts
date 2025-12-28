import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // ✅ Await params — required in Next.js 16 types
    const { id: transactionId } = await context.params;

    if (!transactionId) {
      return NextResponse.json(
        { ok: false, error: "Missing transaction ID" },
        { status: 400 }
      );
    }

    // ✅ Read JWT from cookies
    const cookieHeader = req.headers.get("cookie") || "";
    const token = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token)
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );

    // ✅ Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 403 }
      );
    }

    const { tenantId } = decoded;

    // ✅ Fetch transaction
    const tx = await prisma.transactions.findUnique({
      where: { id: BigInt(transactionId) },
    });

    if (!tx) {
      return NextResponse.json(
        { ok: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // ✅ Prevent invoice theft
    if (tenantId && BigInt(tenantId) !== tx.tenant_id) {
      return NextResponse.json(
        { ok: false, error: "Not authorized to view this invoice" },
        { status: 403 }
      );
    }

    // ✅ Create PDF invoice
    const doc = new PDFDocument();
    const chunks: Uint8Array[] = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {});

    doc.fontSize(20).text("Vaiket Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice ID: ${tx.id}`);
    doc.text(`Transaction ID: ${tx.payu_txn_id || "N/A"}`);
    doc.text(`Date: ${tx.created_at.toLocaleString()}`);
    doc.text(`Plan: ${tx.plan_key}`);
    doc.text(`Amount: ₹${tx.amount}`);
    doc.text(`Status: ${tx.status}`);
    doc.moveDown();

    doc.text("Thank you for choosing Vaiket ❤️", { align: "center" });

    doc.end();

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice_${tx.id}.pdf`,
      },
    });
  } catch (err) {
    console.error("Invoice Error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error generating invoice" },
      { status: 500 }
    );
  }
}
