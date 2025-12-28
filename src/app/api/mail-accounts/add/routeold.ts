// src/app/api/mail-accounts/add/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getTokenData } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const tokenData = getTokenData(req);
    if (!tokenData) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const {
      name, email,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      imapHost, imapPort, imapUser, imapPass, imapSecure,
      provider,
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const account = await prisma.mailAccount.create({
      data: {
        tenantId: tokenData.tenantId,
        name,
        email,
        provider: provider || "custom",
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : 0,
        smtpUser,
        smtpPass,
        smtpSecure: Boolean(smtpSecure),

        imapHost,
        imapPort: imapPort ? Number(imapPort) : null,
        imapUser,
        imapPass,
        imapSecure: Boolean(imapSecure),

        active: true,
      },
    });

    return NextResponse.json({ success: true, account, message: "Mail account created" });
  } catch (err) {
    console.error("Add Mail Account Error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
