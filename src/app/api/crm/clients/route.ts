import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { asRecord, normalizePhoneKey, readText, sanitizeTags } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type ClientRow = {
  id: string;
  lead_id: string | null;
  name: string;
  phone_number: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function serializeClient(row: ClientRow) {
  return {
    id: row.id,
    leadId: row.lead_id,
    name: row.name,
    phoneNumber: row.phone_number,
    email: row.email,
    company: row.company,
    address: row.address,
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
  const whereParts: Prisma.Sql[] = [Prisma.sql`tenant_id = ${auth.tenantId}`];
  if (search) {
    const q = `%${search}%`;
    whereParts.push(
      Prisma.sql`(
        name ILIKE ${q}
        OR COALESCE(phone_number, '') ILIKE ${q}
        OR COALESCE(email, '') ILIKE ${q}
        OR COALESCE(company, '') ILIKE ${q}
      )`
    );
  }

  const rows = await prisma.$queryRaw<ClientRow[]>(
    Prisma.sql`
      SELECT
        id,
        lead_id,
        name,
        phone_number,
        email,
        company,
        address,
        tags,
        notes,
        created_at,
        updated_at
      FROM crm_clients
      WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
      ORDER BY created_at DESC
      LIMIT 500
    `
  );

  return NextResponse.json({ success: true, clients: rows.map(serializeClient) });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const leadId = readText(body.leadId) || null;
  const name = readText(body.name);
  const phoneNumber = readText(body.phoneNumber);
  const email = readText(body.email) || null;
  const company = readText(body.company) || null;
  const address = readText(body.address) || null;
  const notes = readText(body.notes) || null;
  const tags = sanitizeTags(body.tags);

  let resolvedName = name;
  let resolvedPhone = phoneNumber || null;
  let resolvedEmail = email;
  let resolvedCompany = company;

  if (leadId) {
    const leadRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        phone_number: string | null;
        email: string | null;
        company: string | null;
      }>
    >(
      Prisma.sql`
        SELECT id, name, phone_number, email, company
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
          AND id = ${leadId}
        LIMIT 1
      `
    );
    const lead = leadRows[0];
    if (lead) {
      resolvedName = resolvedName || lead.name;
      resolvedPhone = resolvedPhone || lead.phone_number;
      resolvedEmail = resolvedEmail || lead.email;
      resolvedCompany = resolvedCompany || lead.company;
    }
  }

  if (!resolvedName) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }
  const phoneKey = normalizePhoneKey(resolvedPhone);

  const rows = await prisma.$queryRaw<ClientRow[]>(
    Prisma.sql`
      INSERT INTO crm_clients (
        id,
        tenant_id,
        lead_id,
        name,
        phone_number,
        phone_key,
        email,
        company,
        address,
        tags,
        notes,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${auth.tenantId},
        ${leadId},
        ${resolvedName},
        ${resolvedPhone},
        ${phoneKey},
        ${resolvedEmail},
        ${resolvedCompany},
        ${address},
        ${tags},
        ${notes},
        ${auth.userId},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        lead_id,
        name,
        phone_number,
        email,
        company,
        address,
        tags,
        notes,
        created_at,
        updated_at
    `
  );

  const client = rows[0];
  if (!client) {
    return NextResponse.json({ success: false, error: "Failed to create client" }, { status: 500 });
  }

  if (leadId) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE crm_leads
        SET
          status = ${"Won"},
          converted_client_id = ${client.id},
          updated_at = NOW()
        WHERE tenant_id = ${auth.tenantId}
          AND id = ${leadId}
      `
    );
  }

  await Promise.all([
    trackCrmActivity({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "client",
      entityId: client.id,
      action: "client.created",
      description: `${client.name} converted to client`,
      meta: { leadId },
    }),
    createCrmNotification({
      tenantId: auth.tenantId,
      kind: "client",
      title: "New client added",
      body: `${client.name} is now a client.`,
      payload: { clientId: client.id, leadId },
    }),
  ]);

  return NextResponse.json({ success: true, client: serializeClient(client) });
}
