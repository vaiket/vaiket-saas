import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantId,
      projectId,
      templateKey,
      companyName,
      senderName,
      businessEmail,
      phoneNumber,
      website,
    } = body;

    // Basic validation
    if (
      !tenantId ||
      !projectId ||
      !templateKey ||
      !companyName ||
      !senderName ||
      !businessEmail ||
      !phoneNumber ||
      !website
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure project exists & belongs to tenant
    const project = await prisma.projectAutoProject.findFirst({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Upsert branding (insert or update)
    const branding = await prisma.projectAutoBranding.upsert({
      where: { projectId },
      update: {
        templateKey,
        companyName,
        senderName,
        businessEmail,
        phoneNumber,
        website,
      },
      create: {
        projectId,
        tenantId,
        templateKey,
        companyName,
        senderName,
        businessEmail,
        phoneNumber,
        website,
      },
    });

    // Optionally mark project as CONFIGURED (if still DRAFT)
    if (project.status === "DRAFT") {
      await prisma.projectAutoProject.update({
        where: { id: projectId },
        data: { status: "CONFIGURED" },
      });
    }

    return NextResponse.json({
      success: true,
      branding,
    });
  } catch (error) {
    console.error("Save Branding Error:", error);
    return NextResponse.json(
      { error: "Failed to save branding" },
      { status: 500 }
    );
  }
}
