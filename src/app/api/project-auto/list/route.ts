import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const projects = await prisma.projectAutoProject.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
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
  } catch (error) {
    console.error("Project list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
