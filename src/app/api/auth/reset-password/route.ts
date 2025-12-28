// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset-password error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
