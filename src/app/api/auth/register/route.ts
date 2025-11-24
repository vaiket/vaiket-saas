import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, business } = body;

    if (!name || !email || !password || !business) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ✅ Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ 1. Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: business,
        timezone: "Asia/Kolkata",
      },
    });

    // ✅ 2. Create user (admin)
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        password: hashed,
        role: "admin",
      },
    });

    // ✅ 3. Create default tenant AI settings
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        aiPrimary: "deepseek",
        aiFallback: "gemini,chatgpt",
        aiMode: "draft", // ✅ FIXED — use correct Prisma field
      },
    });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      userId: user.id,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}
