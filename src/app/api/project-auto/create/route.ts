import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, name } = body;

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: "tenantId and name are required" },
        { status: 400 }
      );
    }

    // Create project first (id needed for projectCode)
    const project = await prisma.projectAutoProject.create({
      data: {
        tenantId,
        name,
        status: "DRAFT",
        projectCode: "TEMP", // placeholder
      },
    });

    // Generate final projectCode (human + worker friendly)
    const projectCode = `PA-${tenantId}-${project.id}`;

    const updated = await prisma.projectAutoProject.update({
      where: { id: project.id },
      data: { projectCode },
    });

    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (error: any) {
    console.error("Create Project Error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
