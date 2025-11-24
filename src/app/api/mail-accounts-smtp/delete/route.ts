import { prisma } from "@/lib/prisma";

import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: "Missing SMTP id",
      });
    }

    await prisma.smtpAccount.delete({
      where: { id: Number(body.id) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
