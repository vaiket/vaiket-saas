
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ READ JWT COOKIE
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    // 2️⃣ DECODE JWT
    let tokenData: any;
    try {
      tokenData = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 }
      );
    }

    const tenantId = tokenData.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant ID missing" },
        { status: 400 }
      );
    }

    // 3️⃣ READ BODY
    const body = await req.json();
    const {
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

    // 4️⃣ CREATE MAIL ACCOUNT
    const created = await prisma.mailAccount.create({
      data: {
        tenantId,       // 🔥 MOST IMPORTANT
        name,
        email,
        provider: "custom",

        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpSecure,

        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        imapPass,
        imapSecure,

        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mail account saved",
      created,
    });

  } catch (err) {
    console.error("Add Mail Account Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
