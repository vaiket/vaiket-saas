import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { asRecord, normalizeAppointmentStatus, parseDateOrNull, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";
import { sendMetaTextMessage } from "@/lib/whatsapp/meta";

type AppointmentRow = {
  id: string;
  title: string;
  client_id: string | null;
  lead_id: string | null;
  assigned_user_id: number | null;
  start_at: Date;
  end_at: Date | null;
  status: string;
  meta: Prisma.JsonValue;
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

function serializeAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id,
    leadId: row.lead_id,
    assignedUserId: row.assigned_user_id,
    startAt: row.start_at.toISOString(),
    endAt: row.end_at ? row.end_at.toISOString() : null,
    status: row.status,
    meta: row.meta ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    clientName: row.client_name,
    leadName: row.lead_name,
  };
}

async function sendAppointmentMessage(tenantId: number, phone: string | null, text: string) {
  if (!phone || !text) return { sent: false, reason: "missing_phone_or_text" };

  const account = await prisma.waAccount.findFirst({
    where: {
      tenantId,
      status: "connected",
      accessToken: { not: null },
      phoneNumberId: { not: "" },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      phoneNumberId: true,
      accessToken: true,
    },
  });

  if (!account?.accessToken || !account.phoneNumberId) {
    return { sent: false, reason: "no_whatsapp_account" };
  }

  try {
    await sendMetaTextMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      to: phone,
      text,
    });
    return { sent: true, reason: null };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "send_failed",
    };
  }
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const from = parseDateOrNull(url.searchParams.get("from"));
  const to = parseDateOrNull(url.searchParams.get("to"));
  const whereParts: Prisma.Sql[] = [Prisma.sql`a.tenant_id = ${auth.tenantId}`];
  if (from) whereParts.push(Prisma.sql`a.start_at >= ${from}`);
  if (to) whereParts.push(Prisma.sql`a.start_at <= ${to}`);

  const rows = await prisma.$queryRaw<AppointmentRow[]>(
    Prisma.sql`
      SELECT
        a.id,
        a.title,
        a.client_id,
        a.lead_id,
        a.assigned_user_id,
        a.start_at,
        a.end_at,
        a.status,
        a.meta,
        a.created_at,
        a.updated_at,
        c.name AS client_name,
        l.name AS lead_name
      FROM crm_appointments a
      LEFT JOIN crm_clients c
        ON c.tenant_id = a.tenant_id
       AND c.id = a.client_id
      LEFT JOIN crm_leads l
        ON l.tenant_id = a.tenant_id
       AND l.id = a.lead_id
      WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
      ORDER BY a.start_at ASC
      LIMIT 500
    `
  );

  return NextResponse.json({ success: true, appointments: rows.map(serializeAppointment) });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const title = readText(body.title);
  const startAt = parseDateOrNull(body.startAt);
  const endAt = parseDateOrNull(body.endAt);
  const status = normalizeAppointmentStatus(body.status);
  const assignedUserId = parseAssignedUserId(body.assignedUserId);
  const clientId = readText(body.clientId) || null;
  const leadId = readText(body.leadId) || null;
  const reminderMinutes = Number(body.reminderMinutes);

  if (!title || !startAt) {
    return NextResponse.json(
      { success: false, error: "title and startAt are required" },
      { status: 400 }
    );
  }

  const meta = {
    reminderMinutes: Number.isFinite(reminderMinutes) ? Math.max(0, Math.floor(reminderMinutes)) : 30,
  };

  const rows = await prisma.$queryRaw<AppointmentRow[]>(
    Prisma.sql`
      INSERT INTO crm_appointments (
        id,
        tenant_id,
        title,
        client_id,
        lead_id,
        assigned_user_id,
        start_at,
        end_at,
        status,
        meta,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${title},
        ${clientId},
        ${leadId},
        ${assignedUserId},
        ${startAt},
        ${endAt},
        ${status},
        ${JSON.stringify(meta)}::jsonb,
        ${auth.userId},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        title,
        client_id,
        lead_id,
        assigned_user_id,
        start_at,
        end_at,
        status,
        meta,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const appointment = rows[0];
  if (!appointment) {
    return NextResponse.json(
      { success: false, error: "Failed to create appointment" },
      { status: 500 }
    );
  }

  const [targetClient] = clientId
    ? await prisma.$queryRaw<Array<{ name: string | null; phone_number: string | null }>>(
        Prisma.sql`
          SELECT name, phone_number
          FROM crm_clients
          WHERE tenant_id = ${auth.tenantId}
            AND id = ${clientId}
          LIMIT 1
        `
      )
    : [];

  const [targetLead] = !targetClient && leadId
    ? await prisma.$queryRaw<Array<{ name: string | null; phone_number: string | null }>>(
        Prisma.sql`
          SELECT name, phone_number
          FROM crm_leads
          WHERE tenant_id = ${auth.tenantId}
            AND id = ${leadId}
          LIMIT 1
        `
      )
    : [];

  const recipientName = targetClient?.name || targetLead?.name || "there";
  const recipientPhone = targetClient?.phone_number || targetLead?.phone_number || null;
  const formattedDate = startAt.toLocaleString();
  const confirmationMessage = `Hi ${recipientName}, your ${title} is scheduled for ${formattedDate}. Reply if you need to reschedule.`;

  const confirmation = await sendAppointmentMessage(auth.tenantId, recipientPhone, confirmationMessage);
  const reminder = {
    sent: false,
    reason: "scheduled_for_reminder_worker",
  };

  await Promise.all([
    trackCrmActivity({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "appointment",
      entityId: appointment.id,
      action: "appointment.created",
      description: title,
      meta: {
        startAt: startAt.toISOString(),
        endAt: endAt?.toISOString() ?? null,
        confirmationSent: confirmation.sent,
        reminderSent: reminder.sent,
      },
    }),
    createCrmNotification({
      tenantId: auth.tenantId,
      userId: assignedUserId,
      kind: "appointment",
      title: "Appointment scheduled",
      body: `${title} at ${formattedDate}`,
      payload: { appointmentId: appointment.id, startAt: startAt.toISOString() },
    }),
  ]);

  return NextResponse.json({
    success: true,
    appointment: serializeAppointment(appointment),
    whatsapp: {
      confirmation,
      reminder,
    },
  });
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const appointmentId = readText(body.appointmentId);
  if (!appointmentId) {
    return NextResponse.json({ success: false, error: "appointmentId is required" }, { status: 400 });
  }

  const setParts: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
  if (body.status !== undefined) setParts.push(Prisma.sql`status = ${normalizeAppointmentStatus(body.status)}`);
  if (body.startAt !== undefined) setParts.push(Prisma.sql`start_at = ${parseDateOrNull(body.startAt)}`);
  if (body.endAt !== undefined) setParts.push(Prisma.sql`end_at = ${parseDateOrNull(body.endAt)}`);
  if (body.assignedUserId !== undefined) setParts.push(Prisma.sql`assigned_user_id = ${parseAssignedUserId(body.assignedUserId)}`);

  if (setParts.length === 1) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<AppointmentRow[]>(
    Prisma.sql`
      UPDATE crm_appointments
      SET ${Prisma.join(setParts, Prisma.sql`, `)}
      WHERE tenant_id = ${auth.tenantId}
        AND id = ${appointmentId}
      RETURNING
        id,
        title,
        client_id,
        lead_id,
        assigned_user_id,
        start_at,
        end_at,
        status,
        meta,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const updated = rows[0];
  if (!updated) {
    return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
  }

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "appointment",
    entityId: updated.id,
    action: "appointment.updated",
    description: updated.title,
    meta: {
      status: body.status !== undefined ? normalizeAppointmentStatus(body.status) : undefined,
      startAt: body.startAt !== undefined ? parseDateOrNull(body.startAt)?.toISOString() : undefined,
    },
  });

  return NextResponse.json({ success: true, appointment: serializeAppointment(updated) });
}
