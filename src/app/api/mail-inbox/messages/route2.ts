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

    const cookieStore = await cookies();
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

    // Get mail account email
    const mailAcc = await prisma.mailAccount.findFirst({
      where: { tenantId, active: true },
      select: { email: true },
    });

    if (!mailAcc) {
      return NextResponse.json({ success: false, error: "Mail account missing" });
    }

    const myEmail = mailAcc.email;

    // INCOMING (customer → you)
    const incoming = await prisma.incomingEmail.findMany({
      where: {
        tenantId,
        OR: [
          { from: email },
          { to: myEmail }
        ]
      },
      select: {
        id: true,
        from: true,
        to: true,
        subject: true,
        body: true,
        createdAt: true,
      }
    });

    // OUTGOING (you → customer)
    const outgoing = await prisma.mailLog.findMany({
      where: {
        mailAccount: { tenantId },
        to: email,     // 💥 FIX — only outgoing to this customer
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
    ]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return NextResponse.json({ success: true, messages });
  } catch (err) {
    console.error("Message Load Error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
