import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      imapHost,
      imapPort,
      imapUser,
      imapPass,
      imapSecure,
    } = body;

    if (!id)
      return NextResponse.json(
        { success: false, message: "Missing account ID" },
        { status: 400 }
      );

    // prevent duplicate (except itself)
    const exists = await prisma.mailAccount.findFirst({
      where: { email, NOT: { id } },
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "Email already used by another account" },
        { status: 400 }
      );
    }

    await prisma.mailAccount.update({
      where: { id },
      data: {
        name,
        email,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpSecure: Boolean(smtpSecure),
        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        imapPass,
        imapSecure: Boolean(imapSecure),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mail account updated successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Update failed" },
      { status: 500 }
    );
  }
}
