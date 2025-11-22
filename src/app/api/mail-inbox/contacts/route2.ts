// src/app/api/mail-inbox/contacts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();         // FIX
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
    }

    const tenantId = decoded.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 400 });
    }

    // Incoming mails
    const incoming = await prisma.incomingEmail.findMany({
      where: { tenantId },
      select: { from: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    // Outgoing mails
    const outgoing = await prisma.mailLog.findMany({
      where: { mailAccount: { tenantId } },
      select: { to: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });

    const map = new Map();

    // Merge incoming
    for (const m of incoming) {
      const email = m.from || "";
      if (!email) continue;

      const prev = map.get(email);
      if (!prev || prev.lastAt < m.createdAt) {
        map.set(email, {
          email,
          lastMessage: m.subject || "(no subject)",
          lastAt: m.createdAt
        });
      }
    }

    // Merge outgoing
    for (const m of outgoing) {
      const email = m.to || "";
      if (!email) continue;

      const prev = map.get(email);
      if (!prev || prev.lastAt < m.createdAt) {
        map.set(email, {
          email,
          lastMessage: m.subject || "(no subject)",
          lastAt: m.createdAt
        });
      }
    }

    return NextResponse.json({
      success: true,
      contacts: Array.from(map.values())
    });
  } catch (err) {
    console.error("Contacts error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
