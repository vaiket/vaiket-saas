import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, projectId, tenantMailboxId } = body;

    if (!tenantId || !projectId || !tenantMailboxId) {
      return NextResponse.json(
        { error: "tenantId, projectId and tenantMailboxId are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Validate project
    const project = await prisma.projectAutoProject.findFirst({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Validate tenant mailbox
    const mailbox = await prisma.tenantMailbox.findFirst({
      where: { id: tenantMailboxId, tenantId, active: true },
    });

    if (!mailbox) {
      return NextResponse.json(
        { error: "Tenant mailbox not found or inactive" },
        { status: 404 }
      );
    }

    // 3️⃣ Ensure mailbox automation is APPROVED
    const automation = await prisma.tenantMailboxAutomation.findUnique({
      where: { tenantMailboxId },
    });

    if (
      !automation ||
      automation.status !== "APPROVED" ||
      automation.automationEnabled !== true
    ) {
      return NextResponse.json(
        { error: "Mailbox automation not approved" },
        { status: 400 }
      );
    }

    // 4️⃣ Link mailbox to project (upsert)
    const link = await prisma.projectAutoMailbox.upsert({
      where: { projectId },
      update: { tenantMailboxId, tenantId },
      create: { projectId, tenantId, tenantMailboxId },
    });

    return NextResponse.json({
      success: true,
      link,
    });
  } catch (error) {
    console.error("Mailbox link error:", error);
    return NextResponse.json(
      { error: "Failed to link mailbox to project" },
      { status: 500 }
    );
  }
}
