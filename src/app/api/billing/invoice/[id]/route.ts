// src/app/api/billing/invoice/[id]/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: any,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c: string) => c.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subId = Number(params.id);

    const invoice = await prisma.userSubscription.findUnique({
      where: { id: subId },
    });

    if (!invoice || invoice.userId !== userId) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const html = `
      <html>
      <body>
        <h2>Invoice #${invoice.id}</h2>
        <p><strong>Plan:</strong> ${invoice.planKey}</p>
        <p><strong>Status:</strong> ${invoice.status}</p>
        <p><strong>Amount:</strong> ₹${invoice.amountPaid ?? "Not Paid"}</p>
        <p><strong>Date:</strong> ${new Date(
          invoice.createdAt
        ).toLocaleDateString()}</p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html"
      },
    });

  } catch (error) {
    console.error("Invoice Generation Error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
