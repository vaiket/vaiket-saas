import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { ensureTenantSettings } from "@/lib/ensureTenantSettings";

export async function POST(req: Request) {
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

    await ensureTenantSettings(tenantId);

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const mailAcc = await prisma.mailAccount.findFirst({
      where: { tenantId, active: true },
    });

    if (!mailAcc) {
      return NextResponse.json(
        { success: false, error: "SMTP not configured" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: mailAcc.smtpHost,
      port: mailAcc.smtpPort,
      secure: mailAcc.smtpSecure,
      auth: {
        user: mailAcc.smtpUser,
        pass: mailAcc.smtpPass,
      },
    });

    let status = "sent";
    let errorMsg = null;

    try {
      await transporter.sendMail({
        from: mailAcc.email,
        to,
        subject,
        text: body,
        html: `<pre>${body}</pre>`,
      });
    } catch (err: any) {
      status = "error";
      errorMsg = err.message;
      console.error("SMTP SEND ERROR:", err);
    }

    const log = await prisma.mailLog.create({
      data: {
        mailAccountId: mailAcc.id,
        type: "outgoing",
        to,
        from: mailAcc.email,
        subject,
        body,
        status,
        error: errorMsg || undefined,
      },
    });

    if (status === "error") {
      return NextResponse.json(
        { success: false, error: errorMsg, logId: log.id },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, logId: log.id });
  } catch (err) {
    console.error("Send API Fatal Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
