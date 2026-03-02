import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientMeta } from "@/lib/auth/session";

type AuditParams = {
  tenantId: number;
  actorUserId?: number | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  req?: Request;
};

export async function writeAuditLog(params: AuditParams) {
  const { tenantId, actorUserId, action, entity, entityId, meta, req } = params;
  const clientMeta = req ? getClientMeta(req) : { ip: null, userAgent: null };

  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: actorUserId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? null,
        ip: clientMeta.ip,
        userAgent: clientMeta.userAgent,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
