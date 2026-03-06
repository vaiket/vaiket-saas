import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { asRecord, clamp, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type NotificationRow = {
  id: string;
  user_id: number | null;
  kind: string;
  title: string;
  body: string | null;
  payload: Prisma.JsonValue;
  read_at: Date | null;
  created_at: Date;
};

function serializeNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    payload: row.payload ?? {},
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const guard = await ensureCrmAccess(req, "member");
    if (!guard.ok) return guard.response;
    const { auth } = guard;

    const url = new URL(req.url);
    const take = clamp(url.searchParams.get("take"), 30, 1, 100);

    const rows = await prisma.$queryRaw<NotificationRow[]>(
      Prisma.sql`
        SELECT
          id,
          user_id,
          kind,
          title,
          body,
          payload,
          read_at,
          created_at
        FROM crm_notifications
        WHERE tenant_id = ${auth.tenantId}
          AND (user_id IS NULL OR user_id = ${auth.userId})
        ORDER BY created_at DESC
        LIMIT ${take}
      `
    );

    const unread = rows.filter((row) => !row.read_at).length;
    return NextResponse.json({
      success: true,
      notifications: rows.map(serializeNotification),
      unread,
    });
  } catch (error) {
    console.error("GET /api/crm/notifications failed:", error);
    return NextResponse.json({ success: true, notifications: [], unread: 0, degraded: true });
  }
}

export async function PATCH(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const notificationId = readText(body.notificationId);
  const markAll = Boolean(body.markAll);

  if (!notificationId && !markAll) {
    return NextResponse.json(
      { success: false, error: "notificationId or markAll is required" },
      { status: 400 }
    );
  }

  if (markAll) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE crm_notifications
        SET read_at = NOW()
        WHERE tenant_id = ${auth.tenantId}
          AND (user_id IS NULL OR user_id = ${auth.userId})
          AND read_at IS NULL
      `
    );
    return NextResponse.json({ success: true, marked: "all" });
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE crm_notifications
      SET read_at = NOW()
      WHERE tenant_id = ${auth.tenantId}
        AND id = ${notificationId}
        AND (user_id IS NULL OR user_id = ${auth.userId})
    `
  );

  return NextResponse.json({ success: true, marked: notificationId });
}
