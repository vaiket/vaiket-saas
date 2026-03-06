import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type ClientRow = {
  id: string;
  lead_id: string | null;
  name: string;
  phone_number: string | null;
  phone_key: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type ActivityRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  meta: Prisma.JsonValue;
  created_at: Date;
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

export async function GET(req: Request, context: { params: Promise<{ clientId: string }> }) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const params = await context.params;
  const clientId = readText(params.clientId);
  if (!clientId) {
    return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
  }

  const clients = await prisma.$queryRaw<ClientRow[]>(
    Prisma.sql`
      SELECT
        id,
        lead_id,
        name,
        phone_number,
        phone_key,
        email,
        company,
        address,
        tags,
        notes,
        created_at,
        updated_at
      FROM crm_clients
      WHERE tenant_id = ${auth.tenantId}
        AND id = ${clientId}
      LIMIT 1
    `
  );

  const client = clients[0];
  if (!client) {
    return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
  }

  const timelineRows = await prisma.$queryRaw<ActivityRow[]>(
    Prisma.sql`
      SELECT
        id,
        action,
        entity_type,
        entity_id,
        description,
        meta,
        created_at
      FROM crm_activity_logs
      WHERE tenant_id = ${auth.tenantId}
        AND (
          entity_id = ${client.id}
          OR entity_id = ${client.lead_id}
          OR (entity_type = 'client' AND meta ->> 'clientId' = ${client.id})
        )
      ORDER BY created_at DESC
      LIMIT 100
    `
  );

  const waContactRows = client.phone_key
    ? await prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id
          FROM wa_contacts
          WHERE "tenantId" = ${auth.tenantId}
            AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = ${client.phone_key}
          LIMIT 10
        `
      )
    : [];

  const waContactIds = waContactRows.map((row) => row.id);
  const waConversations = waContactIds.length
    ? await prisma.waConversation.findMany({
        where: {
          tenantId: auth.tenantId,
          contactId: { in: waContactIds },
        },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : [];

  const conversationIds = waConversations.map((item) => item.id);
  const waMessages = conversationIds.length
    ? await prisma.waMessage.findMany({
        where: {
          tenantId: auth.tenantId,
          conversationId: { in: conversationIds },
        },
        select: {
          id: true,
          direction: true,
          messageType: true,
          text: true,
          mediaUrl: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 500,
      })
    : [];

  return NextResponse.json({
    success: true,
    client: serializeClient(client),
    timeline: timelineRows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      description: row.description,
      meta: row.meta ?? {},
      createdAt: row.created_at.toISOString(),
    })),
    whatsapp: {
      conversationCount: conversationIds.length,
      messages: waMessages.map((message) => ({
        id: message.id,
        direction: message.direction,
        messageType: message.messageType,
        text: message.text,
        mediaUrl: message.mediaUrl,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}
