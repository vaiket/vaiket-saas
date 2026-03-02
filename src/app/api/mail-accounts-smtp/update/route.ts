import { prisma } from "@/lib/prisma";

import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: "Missing SMTP id",
      });
    }

    const updated = await prisma.smtpAccount.update({
      where: { id: Number(body.id) },
      data: {
        host: body.host,
        port: Number(body.port),
        username: body.username,
        password: body.password,
        fromEmail: body.fromEmail,
        secure: Boolean(body.secure),
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
