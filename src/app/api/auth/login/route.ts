// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { getClientMeta } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("[auth/login] Missing JWT_SECRET");
      return NextResponse.json(
        { success: false, error: "Server misconfigured", code: "missing_jwt_secret" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 400 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Account is not active" },
        { status: 403 }
      );
    }

    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { googleLoginRequired: true },
    });

    if (tenantSettings?.googleLoginRequired) {
      return NextResponse.json(
        {
          success: false,
          error: "This workspace requires Google Sign-In. Use 'Continue with Google'.",
        },
        { status: 403 }
      );
    }

    // Validate password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 400 }
      );
    }

    // Create JWT token
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const { ip, userAgent } = getClientMeta(req);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        jti,
        ip,
        userAgent,
        expiresAt,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
    });

    // FIXED COOKIE SETTINGS (works on localhost + production)
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",       // strict blocks pricing-plan redirect
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (err) {
    console.error("Login Error:", err);
    const code = err instanceof Error ? err.name : "unknown_error";
    return NextResponse.json(
      { success: false, error: "Server Error", code },
      { status: 500 }
    );
  }
}
