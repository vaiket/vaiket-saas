import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type CreateWorkflowBody = {
  name?: unknown;
  triggerType?: unknown;
  triggerConfig?: Prisma.JsonValue;
  actionConfig?: Prisma.JsonValue;
  isActive?: unknown;
};

type UpdateWorkflowBody = {
  id?: unknown;
  name?: unknown;
  triggerType?: unknown;
  triggerConfig?: Prisma.JsonValue;
  actionConfig?: Prisma.JsonValue;
  isActive?: unknown;
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const workflows = await prisma.waWorkflow.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      triggerType: true,
      triggerConfig: true,
      actionConfig: true,
      isActive: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          runs: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, workflows });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as CreateWorkflowBody;
  const name = String(body.name ?? "").trim();
  const triggerType = String(body.triggerType ?? "").trim().toLowerCase();

  if (!name || !triggerType) {
    return NextResponse.json(
      { success: false, error: "name and triggerType are required" },
      { status: 400 }
    );
  }

  const workflow = await prisma.waWorkflow.create({
    data: {
      tenantId: auth.tenantId,
      name,
      triggerType,
      triggerConfig: body.triggerConfig ?? null,
      actionConfig: body.actionConfig ?? null,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      createdByUserId: auth.userId,
    },
    select: {
      id: true,
      name: true,
      triggerType: true,
      triggerConfig: true,
      actionConfig: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.workflow.create",
    entity: "WaWorkflow",
    entityId: workflow.id,
    meta: {
      triggerType: workflow.triggerType,
      isActive: workflow.isActive,
    },
    req,
  });

  return NextResponse.json({ success: true, workflow });
}

export async function PATCH(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as UpdateWorkflowBody;
  const id = String(body.id ?? "").trim();

  if (!id) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const updateData: Prisma.WaWorkflowUpdateInput = {};
  if (body.name !== undefined) updateData.name = String(body.name ?? "").trim();
  if (body.triggerType !== undefined) {
    updateData.triggerType = String(body.triggerType ?? "").trim().toLowerCase();
  }
  if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig ?? null;
  if (body.actionConfig !== undefined) updateData.actionConfig = body.actionConfig ?? null;
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

  const workflow = await prisma.waWorkflow.updateMany({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    data: updateData,
  });

  if (workflow.count === 0) {
    return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.workflow.update",
    entity: "WaWorkflow",
    entityId: id,
    meta: {
      updatedFields: Object.keys(updateData),
    },
    req,
  });

  return NextResponse.json({ success: true });
}
