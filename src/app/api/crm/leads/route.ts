import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { CRM_LEAD_SOURCES } from "@/lib/crm/constants";
import {
  asArray,
  asRecord,
  clamp,
  normalizeLeadStatus,
  normalizePhoneKey,
  parseDateOrNull,
  readText,
  sanitizeTags,
} from "@/lib/crm/helpers";
import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { prisma } from "@/lib/prisma";

type LeadRow = {
  id: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  company: string | null;
  source: string;
  status: string;
  assigned_user_id: number | null;
  tags: string[] | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type LeadCountRow = { total: bigint | number };

function normalizeLeadSource(value: unknown) {
  const source = readText(value);
  if (!source) return "Manual";
  const allowed = CRM_LEAD_SOURCES.find((item) => item.toLowerCase() === source.toLowerCase());
  return allowed ?? "Manual";
}

function parseAssignedUserId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function serializeLead(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phone_number,
    email: row.email,
    company: row.company,
    source: row.source,
    status: row.status,
    assignedUserId: row.assigned_user_id,
    tags: row.tags ?? [],
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const search = readText(url.searchParams.get("search"));
  const status = readText(url.searchParams.get("status"));
  const source = readText(url.searchParams.get("source"));
  const assignedUser = parseAssignedUserId(url.searchParams.get("assignedUserId"));
  const dateFrom = parseDateOrNull(url.searchParams.get("dateFrom"));
  const dateTo = parseDateOrNull(url.searchParams.get("dateTo"));
  const take = clamp(url.searchParams.get("take"), 30, 1, 200);
  const page = clamp(url.searchParams.get("page"), 1, 1, 10_000);
  const offset = (page - 1) * take;

  const whereParts: Prisma.Sql[] = [Prisma.sql`tenant_id = ${auth.tenantId}`];
  if (search) {
    const q = `%${search}%`;
    whereParts.push(
      Prisma.sql`(
        name ILIKE ${q}
        OR COALESCE(email, '') ILIKE ${q}
        OR COALESCE(company, '') ILIKE ${q}
        OR COALESCE(phone_number, '') ILIKE ${q}
      )`
    );
  }
  if (status) whereParts.push(Prisma.sql`status = ${normalizeLeadStatus(status)}`);
  if (source) whereParts.push(Prisma.sql`source = ${normalizeLeadSource(source)}`);
  if (assignedUser) whereParts.push(Prisma.sql`assigned_user_id = ${assignedUser}`);
  if (dateFrom) whereParts.push(Prisma.sql`created_at >= ${dateFrom}`);
  if (dateTo) whereParts.push(Prisma.sql`created_at <= ${dateTo}`);

  const whereSql = Prisma.sql`WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}`;

  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<LeadRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          phone_number,
          email,
          company,
          source,
          status,
          assigned_user_id,
          tags,
          notes,
          created_at,
          updated_at
        FROM crm_leads
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ${take}
        OFFSET ${offset}
      `
    ),
    prisma.$queryRaw<LeadCountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_leads
        ${whereSql}
      `
    ),
  ]);

  const totalRaw = counts[0]?.total ?? 0;
  const total =
    typeof totalRaw === "bigint" ? Number(totalRaw) : Number.parseInt(String(totalRaw), 10) || 0;

  return NextResponse.json({
    success: true,
    leads: rows.map(serializeLead),
    pagination: {
      total,
      take,
      page,
      totalPages: Math.max(1, Math.ceil(total / take)),
    },
  });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const name = readText(body.name);
  const phoneNumber = readText(body.phoneNumber);
  const email = readText(body.email) || null;
  const company = readText(body.company) || null;
  const source = normalizeLeadSource(body.source);
  const status = normalizeLeadStatus(body.status);
  const assignedUserId = parseAssignedUserId(body.assignedUserId);
  const tags = sanitizeTags(body.tags);
  const notes = readText(body.notes) || null;

  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const phoneKey = normalizePhoneKey(phoneNumber);
  const existing =
    phoneKey &&
    (await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
          AND phone_key = ${phoneKey}
        LIMIT 1
      `
    ));
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { success: false, error: "A lead with this phone number already exists" },
      { status: 409 }
    );
  }

  const created = await prisma.$queryRaw<LeadRow[]>(
    Prisma.sql`
      INSERT INTO crm_leads (
        id,
        tenant_id,
        name,
        phone_number,
        phone_key,
        email,
        company,
        source,
        status,
        assigned_user_id,
        tags,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${name},
        ${phoneNumber || null},
        ${phoneKey},
        ${email},
        ${company},
        ${source},
        ${status},
        ${assignedUserId},
        ${tags},
        ${notes},
        ${auth.userId},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        name,
        phone_number,
        email,
        company,
        source,
        status,
        assigned_user_id,
        tags,
        notes,
        created_at,
        updated_at
    `
  );

  const lead = created[0];
  if (!lead) {
    return NextResponse.json({ success: false, error: "Failed to create lead" }, { status: 500 });
  }

  await Promise.all([
    trackCrmActivity({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "lead",
      entityId: lead.id,
      action: "lead.created",
      description: `${name} created from ${source}`,
      meta: { source, status, assignedUserId, phoneNumber: phoneNumber || null },
    }),
    createCrmNotification({
      tenantId: auth.tenantId,
      userId: assignedUserId,
      kind: "lead",
      title: "New lead created",
      body: `${name} was added to CRM from ${source}.`,
      payload: { leadId: lead.id, source },
    }),
  ]);

  return NextResponse.json({ success: true, lead: serializeLead(lead) });
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const ids = asArray<string>(body.ids).map((item) => readText(item)).filter(Boolean).slice(0, 200);

  if (ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids are required" }, { status: 400 });
  }

  const setParts: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
  const statusRaw = readText(body.status);
  const assignedRaw = body.assignedUserId;
  const tagsRaw = body.tags;

  if (statusRaw) setParts.push(Prisma.sql`status = ${normalizeLeadStatus(statusRaw)}`);
  if (assignedRaw !== undefined) {
    setParts.push(Prisma.sql`assigned_user_id = ${parseAssignedUserId(assignedRaw)}`);
  }
  if (tagsRaw !== undefined) setParts.push(Prisma.sql`tags = ${sanitizeTags(tagsRaw)}`);

  if (setParts.length === 1) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  const idSql = Prisma.join(ids.map((id) => Prisma.sql`${id}`));

  const updatedRows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      UPDATE crm_leads
      SET ${Prisma.join(setParts, Prisma.sql`, `)}
      WHERE tenant_id = ${auth.tenantId}
        AND id IN (${idSql})
      RETURNING id
    `
  );

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "lead",
    action: "lead.bulk_update",
    description: `${updatedRows.length} lead(s) updated`,
    meta: {
      updatedCount: updatedRows.length,
      status: statusRaw || null,
      assignedUserId: parseAssignedUserId(assignedRaw),
      tags: tagsRaw === undefined ? undefined : sanitizeTags(tagsRaw),
    },
  });

  return NextResponse.json({ success: true, updatedCount: updatedRows.length });
}
