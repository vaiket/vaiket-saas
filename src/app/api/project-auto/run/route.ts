import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, projectId, action } = body;

    if (!tenantId || !projectId || !action) {
      return NextResponse.json(
        { error: "tenantId, projectId and action are required" },
        { status: 400 }
      );
    }

    const project = await prisma.projectAutoProject.findFirst({
      where: { id: projectId, tenantId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // PAUSE / STOP directly allowed
    if (action === "PAUSE" || action === "STOP") {
      const updated = await prisma.projectAutoProject.update({
        where: { id: projectId },
        data: { status: action === "PAUSE" ? "PAUSED" : "STOPPED" },
      });

      return NextResponse.json({ success: true, project: updated });
    }

    // RUN checks
    if (action === "RUN") {
      // 1️⃣ Branding check
      const branding = await prisma.projectAutoBranding.findUnique({
        where: { projectId },
      });

      if (!branding) {
        return NextResponse.json(
          { error: "Email branding not configured" },
          { status: 400 }
        );
      }

      // 2️⃣ Mailbox mapping check
      const mailboxLink = await prisma.projectAutoMailbox.findUnique({
        where: { projectId },
      });

      if (!mailboxLink) {
        return NextResponse.json(
          { error: "Mailbox not linked to project" },
          { status: 400 }
        );
      }

      // 3️⃣ Mailbox automation approval check
      const mailboxAutomation =
        await prisma.tenantMailboxAutomation.findUnique({
          where: { tenantMailboxId: mailboxLink.tenantMailboxId },
        });

      if (
        !mailboxAutomation ||
        mailboxAutomation.status !== "APPROVED" ||
        mailboxAutomation.automationEnabled !== true
      ) {
        return NextResponse.json(
          { error: "Mailbox automation not approved" },
          { status: 400 }
        );
      }

      // All checks passed → RUN
      const updated = await prisma.projectAutoProject.update({
        where: { id: projectId },
        data: { status: "RUNNING" },
      });

      return NextResponse.json({
        success: true,
        message: "Automation started",
        project: updated,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Run/Pause error:", error);
    return NextResponse.json(
      { error: "Failed to update project status" },
      { status: 500 }
    );
  }
}
