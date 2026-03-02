import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emails, subject, html } = body;

    if (!emails || !subject || !html) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // ✅ Get tenant from JWT
    const cookie = req.headers.get("cookie") || "";
    const token = cookie.match(/token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const tenantId = decoded.tenantId;

    // ✅ Save Campaign
    const campaign = await prisma.smtp_campaigns.create({
      data: {
        tenantid: tenantId,
        subject,
        body: html,
        status: "pending",
      },
    });

    // ✅ Insert Queue
    for (const email of emails) {
      await prisma.smtp_queue.create({
        data: {
          tenant_id: tenantId,
          campaign_id: campaign.id,
          email,
          status: "pending",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Campaign queued successfully",
    });

  } catch (err) {
    console.error("MAIL SEND ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
