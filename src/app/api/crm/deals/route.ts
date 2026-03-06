import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { trackCrmActivity } from "@/lib/crm/activity";
import { CRM_DEAL_STAGES } from "@/lib/crm/constants";
import { asArray, asRecord, normalizeDealStage, parseDateOrNull, parseNumberOrDefault, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type DealRow = {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  title: string;
  stage: string;
  value: string | number;
  assigned_user_id: number | null;
  expected_closing_date: Date | null;
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

function serializeDeal(row: DealRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    leadId: row.lead_id,
    title: row.title,
    stage: row.stage,
    value: parseNumberOrDefault(row.value, 0),
    assignedUserId: row.assigned_user_id,
    expectedClosingDate: row.expected_closing_date ? row.expected_closing_date.toISOString() : null,
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

  const deals = await prisma.$queryRaw<DealRow[]>(
    Prisma.sql`
      SELECT
        d.id,
        d.client_id,
        d.lead_id,
        d.title,
        d.stage,
        d.value,
        d.assigned_user_id,
        d.expected_closing_date,
        d.created_at,
        d.updated_at,
        c.name AS client_name,
        l.name AS lead_name
      FROM crm_deals d
      LEFT JOIN crm_clients c
        ON c.tenant_id = d.tenant_id
       AND c.id = d.client_id
      LEFT JOIN crm_leads l
        ON l.tenant_id = d.tenant_id
       AND l.id = d.lead_id
      WHERE d.tenant_id = ${auth.tenantId}
      ORDER BY d.updated_at DESC
      LIMIT 500
    `
  );

  const grouped = CRM_DEAL_STAGES.map((stage) => ({
    stage,
    items: deals.filter((deal) => deal.stage === stage).map(serializeDeal),
    totalValue: deals
      .filter((deal) => deal.stage === stage)
      .reduce((sum, deal) => sum + parseNumberOrDefault(deal.value, 0), 0),
  }));

  return NextResponse.json({
    success: true,
    stages: grouped,
    deals: deals.map(serializeDeal),
  });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const title = readText(body.title);
  const stage = normalizeDealStage(body.stage);
  const value = parseNumberOrDefault(body.value, 0);
  const clientId = readText(body.clientId) || null;
  const leadId = readText(body.leadId) || null;
  const assignedUserId = parseAssignedUserId(body.assignedUserId);
  const expectedClosingDate = parseDateOrNull(body.expectedClosingDate);

  if (!title) {
    return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<DealRow[]>(
    Prisma.sql`
      INSERT INTO crm_deals (
        id,
        tenant_id,
        client_id,
        lead_id,
        title,
        stage,
        value,
        assigned_user_id,
        expected_closing_date,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${clientId},
        ${leadId},
        ${title},
        ${stage},
        ${value},
        ${assignedUserId},
        ${expectedClosingDate},
        ${auth.userId},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        client_id,
        lead_id,
        title,
        stage,
        value,
        assigned_user_id,
        expected_closing_date,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const created = rows[0];
  if (!created) {
    return NextResponse.json({ success: false, error: "Failed to create deal" }, { status: 500 });
  }

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "deal",
    entityId: created.id,
    action: "deal.created",
    description: `${title} added to pipeline`,
    meta: { stage, value, clientId, leadId },
  });

  return NextResponse.json({ success: true, deal: serializeDeal(created) });
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const dealId = readText(body.dealId);
  if (!dealId) {
    return NextResponse.json({ success: false, error: "dealId is required" }, { status: 400 });
  }

  const setParts: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
  const stageRaw = readText(body.stage);
  if (stageRaw) setParts.push(Prisma.sql`stage = ${normalizeDealStage(stageRaw)}`);
  if (body.value !== undefined) setParts.push(Prisma.sql`value = ${parseNumberOrDefault(body.value, 0)}`);
  if (body.expectedClosingDate !== undefined) {
    setParts.push(Prisma.sql`expected_closing_date = ${parseDateOrNull(body.expectedClosingDate)}`);
  }
  if (body.assignedUserId !== undefined) {
    setParts.push(Prisma.sql`assigned_user_id = ${parseAssignedUserId(body.assignedUserId)}`);
  }

  if (setParts.length === 1) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<DealRow[]>(
    Prisma.sql`
      UPDATE crm_deals
      SET ${Prisma.join(setParts, Prisma.sql`, `)}
      WHERE tenant_id = ${auth.tenantId}
        AND id = ${dealId}
      RETURNING
        id,
        client_id,
        lead_id,
        title,
        stage,
        value,
        assigned_user_id,
        expected_closing_date,
        created_at,
        updated_at,
        NULL::text AS client_name,
        NULL::text AS lead_name
    `
  );

  const updated = rows[0];
  if (!updated) {
    return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
  }

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "deal",
    entityId: updated.id,
    action: "deal.updated",
    description: `${updated.title} updated`,
    meta: {
      stage: stageRaw ? normalizeDealStage(stageRaw) : undefined,
      value: body.value !== undefined ? parseNumberOrDefault(body.value, 0) : undefined,
    },
  });

  return NextResponse.json({ success: true, deal: serializeDeal(updated) });
}

export async function DELETE(req: Request) {
  const guard = await ensureCrmAccess(req, "admin");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const ids = asArray<string>(body.ids).map((item) => readText(item)).filter(Boolean).slice(0, 200);
  if (ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids are required" }, { status: 400 });
  }

  const deleted = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      DELETE FROM crm_deals
      WHERE tenant_id = ${auth.tenantId}
        AND id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}`))})
      RETURNING id
    `
  );

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "deal",
    action: "deal.deleted",
    description: `${deleted.length} deal(s) removed`,
    meta: { ids },
  });

  return NextResponse.json({ success: true, deletedCount: deleted.length });
}
