import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { name, email, password, business } = await req.json();

    if (!name || !email || !password || !business) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    // ✅ Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
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
        onboardingCompleted: false, // 🔑 VERY IMPORTANT
      },
    });

    // ✅ 3. Default tenant AI settings
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        aiPrimary: "deepseek",
        aiFallback: "gemini,chatgpt",
        aiMode: "draft",
      },
    });

    // ✅ 4. CREATE JWT TOKEN (same style as login)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // ✅ 5. SET COOKIE (IDENTICAL to login)
    const response = NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,           // localhost safe
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (err) {
    console.error("Register Error:", err);
    return NextResponse.json(
      { success: false, error: "Server Error" },
      { status: 500 }
    );
  }
}
