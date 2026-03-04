import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type PasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as PasswordPayload;
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All password fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New password and confirm password do not match" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      return NextResponse.json(
        { success: false, error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        password: hashed,
        passwordUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("POST /api/auth/change-password failed:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

