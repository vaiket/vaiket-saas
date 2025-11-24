// src/app/api/mail-accounts/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getTokenData } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const {
      id, name, email,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      imapHost, imapPort, imapUser, imapPass, imapSecure,
      active,
    } = body;

    if (!id) return NextResponse.json({ success: false, error: "Account id missing" }, { status: 400 });

    const existing = await prisma.mailAccount.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tokenData.tenantId) {
      return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });
    }

    const updated = await prisma.mailAccount.update({
      where: { id },
      data: {
        name,
        email,
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : existing.smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure: Boolean(smtpSecure),

        imapHost,
        imapPort: imapPort ? Number(imapPort) : existing.imapPort,
        imapUser,
        imapPass,
        imapSecure: Boolean(imapSecure),

        active: typeof active === "boolean" ? active : existing.active,
      },
    });

    return NextResponse.json({ success: true, account: updated, message: "Mail account updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
