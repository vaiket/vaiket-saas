import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { asRecord, normalizeTaskPriority, normalizeTaskStatus, parseDateOrNull, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type TaskRow = {
  id: string;
  title: string;
  assigned_user_id: number | null;
  client_id: string | null;
  lead_id: string | null;
  due_date: Date | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  client_name: string | null;
  lead_name: string | null;
};

function parseAssignedUserId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function serializeTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    assignedUserId: row.assigned_user_id,
    clientId: row.client_id,
    leadId: row.lead_id,
    dueDate: row.due_date ? row.due_date.toISOString() : null,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    clientName: row.client_name,
    leadName: row.lead_name,
  };
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const status = readText(url.searchParams.get("status"));
  const assignedUser = parseAssignedUserId(url.searchParams.get("assignedUserId"));
  const whereParts: Prisma.Sql[] = [Prisma.sql`t.tenant_id = ${auth.tenantId}`];
  if (status) whereParts.push(Prisma.sql`t.status = ${normalizeTaskStatus(status)}`);
  if (assignedUser) whereParts.push(Prisma.sql`t.assigned_user_id = ${assignedUser}`);

  const tasks = await prisma.$queryRaw<TaskRow[]>(
    Prisma.sql`
      SELECT
        t.id,
        t.title,
        t.assigned_user_id,
        t.client_id,
        t.lead_id,
        t.due_date,
        t.priority,
        t.status,
        t.notes,
        t.created_at,
        t.updated_at,
        c.name AS client_name,
        l.name AS lead_name
      FROM crm_tasks t
      LEFT JOIN crm_clients c
        ON c.tenant_id = t.tenant_id
       AND c.id = t.client_id
      LEFT JOIN crm_leads l
        ON l.tenant_id = t.tenant_id
       AND l.id = t.lead_id
      WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
      ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
      LIMIT 500
    `
  );

  return NextResponse.json({ success: true, tasks: tasks.map(serializeTask) });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const title = readText(body.title);
  const dueDate = parseDateOrNull(body.dueDate);
  const priority = normalizeTaskPriority(body.priority);
  const status = normalizeTaskStatus(body.status);
  const assignedUserId = parseAssignedUserId(body.assignedUserId);
  const clientId = readText(body.clientId) || null;
  const leadId = readText(body.leadId) || null;
  const notes = readText(body.notes) || null;

  if (!title) {
    return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<TaskRow[]>(
    Prisma.sql`
      INSERT INTO crm_tasks (
        id,
        tenant_id,
        title,
        assigned_user_id,
        client_id,
        lead_id,
        due_date,
        priority,
        status,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${title},
        ${assignedUserId},
        ${clientId},
        ${leadId},
        ${dueDate},
        ${priority},
        ${status},
        ${notes},
        ${auth.userId},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title,
        assigned_user_id,
        client_id,
        lead_id,
        due_date,
        priority,
        status,
        notes,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const task = rows[0];
  if (!task) {
    return NextResponse.json({ success: false, error: "Failed to create task" }, { status: 500 });
  }

  await Promise.all([
    trackCrmActivity({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "task",
      entityId: task.id,
      action: "task.created",
      description: title,
      meta: { assignedUserId, dueDate: dueDate?.toISOString() ?? null, priority, status },
    }),
    createCrmNotification({
      tenantId: auth.tenantId,
      userId: assignedUserId,
      kind: "task",
      title: "New task assigned",
      body: `Task: ${title}`,
      payload: { taskId: task.id, dueDate: dueDate?.toISOString() ?? null },
    }),
  ]);

  return NextResponse.json({ success: true, task: serializeTask(task) });
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const taskId = readText(body.taskId);
  if (!taskId) {
    return NextResponse.json({ success: false, error: "taskId is required" }, { status: 400 });
  }

  const setParts: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
  if (body.status !== undefined) setParts.push(Prisma.sql`status = ${normalizeTaskStatus(body.status)}`);
  if (body.priority !== undefined) setParts.push(Prisma.sql`priority = ${normalizeTaskPriority(body.priority)}`);
  if (body.assignedUserId !== undefined) setParts.push(Prisma.sql`assigned_user_id = ${parseAssignedUserId(body.assignedUserId)}`);
  if (body.dueDate !== undefined) setParts.push(Prisma.sql`due_date = ${parseDateOrNull(body.dueDate)}`);
  if (body.notes !== undefined) setParts.push(Prisma.sql`notes = ${readText(body.notes) || null}`);

  if (setParts.length === 1) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<TaskRow[]>(
    Prisma.sql`
      UPDATE crm_tasks
      SET ${Prisma.join(setParts, Prisma.sql`, `)}
      WHERE tenant_id = ${auth.tenantId}
        AND id = ${taskId}
      RETURNING
        id,
        title,
        assigned_user_id,
        client_id,
        lead_id,
        due_date,
        priority,
        status,
        notes,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const updated = rows[0];
  if (!updated) {
    return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
  }

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "task",
    entityId: updated.id,
    action: "task.updated",
    description: updated.title,
    meta: {
      status: body.status !== undefined ? normalizeTaskStatus(body.status) : undefined,
      priority: body.priority !== undefined ? normalizeTaskPriority(body.priority) : undefined,
    },
  });

  return NextResponse.json({ success: true, task: serializeTask(updated) });
}
