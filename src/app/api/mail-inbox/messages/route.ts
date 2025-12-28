import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { ensureTenantSettings } from "@/lib/ensureTenantSettings";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const tenantId = decoded?.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant" },
        { status: 403 }
      );
    }

    // ✅ Ensure tenant settings exist
    await ensureTenantSettings(tenantId);

    // ✅ Fetch incoming emails for contact
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
    });

    // ✅ Fetch outgoing emails for contact
    const outgoing = await prisma.mailLog.findMany({
      where: {
        mailAccount: { tenantId },
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
    });

    // ✅ Merge + sort chronologically
    const messages = [
      ...incoming.map((m) => ({
        id: `in-${m.id}`,
        direction: "in",
        subject: m.subject,
        body: m.body,
        createdAt: m.createdAt,
      })),
      ...outgoing.map((m) => ({
        id: `out-${m.id}`,
        direction: "out",
        subject: m.subject,
        body: m.body,
        createdAt: m.createdAt,
        status: m.status,
      })),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return NextResponse.json({ success: true, messages });
  } catch (err) {
    console.error("Messages error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
