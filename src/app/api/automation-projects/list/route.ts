import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // ✅ Next.js 16 cookies fix
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const projects = await prisma.projectAutoProject.findMany({
      where: {
        tenantId: decoded.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        projectCode: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (err) {
    console.error("Automation Project List Error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
