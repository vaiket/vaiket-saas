import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // ✅ NEXT.JS 16 FIX — await cookies()
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ unique project code
    const projectCode =
      "PRJ_" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const project = await prisma.projectAutoProject.create({
      data: {
        tenantId: decoded.tenantId,
        name: name.trim(),
        projectCode,
        status: "DRAFT",
      },
    });

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (err) {
    console.error("Automation Project Create Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
