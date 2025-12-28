import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { ensureTenantSettings } from "@/lib/ensureTenantSettings";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const tenantId = decoded.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant missing" },
        { status: 400 }
      );
    }

    // Ensure settings exist
    await ensureTenantSettings(tenantId);

    const incoming = await prisma.incomingEmail.findMany({
      where: { tenantId },
      select: { from: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const outgoing = await prisma.mailLog.findMany({
      where: { mailAccount: { tenantId } },
      select: { to: true, subject: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const map = new Map();

    for (const m of incoming) {
      const email = m.from;
      if (!email) continue;

      const old = map.get(email);
      if (!old || old.lastAt < m.createdAt) {
        map.set(email, {
          email,
          lastMessage: m.subject || "(no subject)",
          lastAt: m.createdAt,
        });
      }
    }

    for (const m of outgoing) {
      const email = m.to;
      if (!email) continue;

      const old = map.get(email);
      if (!old || old.lastAt < m.createdAt) {
        map.set(email, {
          email,
          lastMessage: m.subject || "(no subject)",
          lastAt: m.createdAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      contacts: Array.from(map.values()),
    });
  } catch (err) {
    console.error("Contacts error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
