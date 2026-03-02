import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const requiredFields = ["host", "port", "username", "password", "fromEmail"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, error: `Missing field: ${field}` });
      }
    }

    const smtp = await prisma.smtpAccount.create({
      data: {
        userId: body.userId || 1,
        host: body.host,
        port: Number(body.port),
        username: body.username,
        password: body.password,
        fromEmail: body.fromEmail,
        secure: Boolean(body.secure),
      },
    });

    return NextResponse.json({ success: true, smtp });
  } catch (err: any) {
    console.error("SMTP Create Error:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
