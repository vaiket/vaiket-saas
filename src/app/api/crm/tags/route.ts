import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { trackCrmActivity } from "@/lib/crm/activity";
import { asRecord, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type TagRow = {
  id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
};

function normalizeColor(value: unknown) {
  const raw = readText(value);
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "#6366F1";
}

function serializeTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const rows = await prisma.$queryRaw<TagRow[]>(
    Prisma.sql`
      SELECT id, name, color, created_at, updated_at
      FROM crm_tags
      WHERE tenant_id = ${auth.tenantId}
      ORDER BY lower(name) ASC
      LIMIT 200
    `
  );

  return NextResponse.json({ success: true, tags: rows.map(serializeTag) });
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const name = readText(body.name);
  const color = normalizeColor(body.color);

  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const existingRows = await prisma.$queryRaw<TagRow[]>(
    Prisma.sql`
      SELECT id, name, color, created_at, updated_at
      FROM crm_tags
      WHERE tenant_id = ${auth.tenantId}
        AND lower(name) = lower(${name})
      LIMIT 1
    `
  );

  const rows =
    existingRows.length > 0
      ? await prisma.$queryRaw<TagRow[]>(
          Prisma.sql`
            UPDATE crm_tags
            SET
              name = ${name},
              color = ${color},
              updated_at = NOW()
            WHERE tenant_id = ${auth.tenantId}
              AND id = ${existingRows[0].id}
            RETURNING id, name, color, created_at, updated_at
          `
        )
      : await prisma.$queryRaw<TagRow[]>(
          Prisma.sql`
            INSERT INTO crm_tags (
              id,
              tenant_id,
              name,
              color,
              created_by_user_id,
              created_at,
              updated_at
            ) VALUES (
              ${crypto.randomUUID()},
              ${auth.tenantId},
              ${name},
              ${color},
              ${auth.userId},
              NOW(),
              NOW()
            )
            RETURNING id, name, color, created_at, updated_at
          `
        );

  const tag = rows[0];
  if (!tag) {
    return NextResponse.json({ success: false, error: "Failed to save tag" }, { status: 500 });
  }

  await trackCrmActivity({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "tag",
    entityId: tag.id,
    action: "tag.saved",
    description: tag.name,
    meta: { color: tag.color },
  });

  return NextResponse.json({ success: true, tag: serializeTag(tag) });
}
