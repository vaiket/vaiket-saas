import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type TrackCrmActivityArgs = {
  tenantId: number;
  actorUserId?: number | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  description?: string | null;
  meta?: Record<string, unknown>;
};

type CreateCrmNotificationArgs = {
  tenantId: number;
  userId?: number | null;
  kind: string;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown>;
};

export async function trackCrmActivity(args: TrackCrmActivityArgs) {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO crm_activity_logs (
        id,
        tenant_id,
        actor_user_id,
        entity_type,
        entity_id,
        action,
        description,
        meta,
        created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${args.tenantId},
        ${args.actorUserId ?? null},
        ${args.entityType},
        ${args.entityId ?? null},
        ${args.action},
        ${args.description ?? null},
        ${JSON.stringify(args.meta ?? {})}::jsonb,
        NOW()
      )
    `
  );
}

export async function createCrmNotification(args: CreateCrmNotificationArgs) {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO crm_notifications (
        id,
        tenant_id,
        user_id,
        kind,
        title,
        body,
        payload,
        created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${args.tenantId},
        ${args.userId ?? null},
        ${args.kind},
        ${args.title},
        ${args.body ?? null},
        ${JSON.stringify(args.payload ?? {})}::jsonb,
        NOW()
      )
    `
  );
}
