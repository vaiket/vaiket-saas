// src/app/api/mail-inbox/contacts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
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

    // INCOMING EMAILS
    const incoming = await prisma.incomingEmail.findMany({
      where: { tenantId },
      select: { from: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // OUTGOING EMAILS (Fix: correct relation filter)
    const outgoing = await prisma.mailLog.findMany({
      where: {
        mailAccount: {
          tenantId: tenantId
        }
      },
      select: { to: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // MAP CONTACTS (whatsapp style)
    const map = new Map<
      string,
      { email: string; lastMessage: string | null; lastAt: Date }
    >();

    // incoming → uses "from"
    for (const mail of incoming) {
      const email = mail.from || "";
      if (!email) continue;

      const exists = map.get(email);
      if (!exists || exists.lastAt < mail.createdAt) {
        map.set(email, {
          email,
          lastMessage: mail.subject || "(no subject)",
          lastAt: mail.createdAt,
        });
      }
    }

    // outgoing → uses "to"
    for (const mail of outgoing) {
      const email = mail.to || "";
      if (!email) continue;

      const exists = map.get(email);
      if (!exists || exists.lastAt < mail.createdAt) {
        map.set(email, {
          email,
          lastMessage: mail.subject || "(no subject)",
          lastAt: mail.createdAt,
        });
      }
    }

    const contacts = Array.from(map.values()).sort(
      (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
    );

    return NextResponse.json({ success: true, contacts });

  } catch (err) {
    console.error("Contacts error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
