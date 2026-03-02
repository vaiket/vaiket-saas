import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { tenantId, password } = await req.json();

    if (!tenantId || !password) {
      return NextResponse.json(
        { success: false, error: "Missing data" },
        { status: 400 }
      );
    }

    await prisma.smtpCredentials.update({
      where: { tenantId },
      data: {
        password,
        host: "mail.astramize.com", // ✅ FIXED HOST
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password saved successfully",
    });
  } catch (err) {
    console.error("SAVE SMTP PASSWORD ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
