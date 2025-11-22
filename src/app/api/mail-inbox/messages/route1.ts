// src/app/api/mail-inbox/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 });
    }

    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
    }

    const tenantId = decoded.tenantId as number;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 400 });
    }

    // ================================
    // 1) INCOMING EMAILS (Customer → You)
    // ================================
    const incoming = await prisma.incomingEmail.findMany({
      where: {
        tenantId,
        OR: [{ from: email }, { to: email }],
      },
      select: {
        id: true,
        from: true,
        to: true,
        subject: true,
        body: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" }
    });

    // ================================
    // 2) OUTGOING EMAILS (You → Customer)
    // FIXED: Correct Prisma relation filter
    // ================================
    const outgoing = await prisma.mailLog.findMany({
      where: {
        mailAccount: {
          tenantId: tenantId   // <-- FIXED
        },
        OR: [{ to: email }, { from: email }],
      },
      select: {
        id: true,
        to: true,
        from: true,
        subject: true,
        body: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" }
    });

    // Merge into WhatsApp-style message list
    const messages = [
      ...incoming.map((m) => ({
        id: `in-${m.id}`,
        direction: "in" as const,
        subject: m.subject,
        body: m.body,
        createdAt: m.createdAt,
      })),
      ...outgoing.map((m) => ({
        id: `out-${m.id}`,
        direction: "out" as const,
        subject: m.subject,
        body: m.body,
        createdAt: m.createdAt,
        status: m.status,
      })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return NextResponse.json({
      success: true,
      contact: { email },
      messages,
    });

  } catch (err) {
    console.error("Messages error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
