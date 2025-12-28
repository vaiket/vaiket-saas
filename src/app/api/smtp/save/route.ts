// src/app/api/smtp/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenData } from "@/lib/auth1";

export async function POST(req: Request) {
  try {
    const token = getTokenData(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { host, port, username, password, secure, fromEmail } = body;

    if (!host || !port || !username || !password) {
      return NextResponse.json({ success: false, error: "Missing SMTP fields" }, { status: 400 });
    }

    // Upsert SmtpCredentials by tenantId (unique)
    const existing = await prisma.smtpCredentials.findUnique({
      where: { tenantId: token.tenantId },
    });

    if (existing) {
      const updated = await prisma.smtpCredentials.update({
        where: { tenantId: token.tenantId },
        data: {
          host,
          port,
          username,
          password,
          createdAt: existing.createdAt, // keep original createdAt
        },
      });
      return NextResponse.json({ success: true, credentials: updated });
    } else {
      const created = await prisma.smtpCredentials.create({
        data: {
          tenantId: token.tenantId,
          host,
          port,
          username,
          password,
        },
      });
      return NextResponse.json({ success: true, credentials: created });
    }
  } catch (err: any) {
    console.error("SMTP save error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
