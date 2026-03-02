import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1️⃣ FIND USER
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json({ success: false, error: "User not found" });

    // 2️⃣ VERIFY PASSWORD
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return NextResponse.json({ success: false, error: "Invalid password" });

    // 3️⃣ CREATE JWT WITH TENANT ID (VERY IMPORTANT)
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId, // ⭐ THIS IS THE FIX ⭐
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // 4️⃣ SET COOKIE
    const response = NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,        // change to true in production
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (err) {
    console.error("Login Error:", err);
    return NextResponse.json({ success: false, error: "Server error" });
  }
}
