import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Get token
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔓 Decode token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ IMPORTANT FIX — await params
    const { id } = await params;
    const projectId = Number(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project id" },
        { status: 400 }
      );
    }

    // 📦 Fetch project (tenant safe)
    const project = await prisma.projectAutoProject.findFirst({
      where: {
        id: projectId,
        tenantId: decoded.tenantId,
      },
      select: {
        id: true,
        name: true,
        projectCode: true,
        status: true,
        createdAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (err) {
    console.error("Get Project Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
