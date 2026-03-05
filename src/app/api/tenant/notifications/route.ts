import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth/session";

type RawAuditLog = {
  id: bigint;
  action: string;
  entity: string;
  entityId: string | null;
  actorUserId: number | null;
  meta: Prisma.JsonValue;
  createdAt: Date;
};

function asMetaObject(meta: Prisma.JsonValue): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildMessage(log: RawAuditLog, actorLabel: string) {
  const meta = asMetaObject(log.meta);

  switch (log.action) {
    case "tenant.auth.signup": {
      const email = asString(meta.email);
      return {
        title: "New Signup",
        body: email
          ? `${actorLabel} signed up with ${email}.`
          : `${actorLabel} created a new workspace account.`,
      };
    }
    case "tenant.team.invite": {
      const email = asString(meta.email);
      const role = asString(meta.role);
      return {
        title: "Team Invite Sent",
        body: email
          ? `${actorLabel} invited ${email}${role ? ` as ${role}` : ""}.`
          : `${actorLabel} sent a team invitation.`,
      };
    }
    case "tenant.team.invite.accept": {
      const email = asString(meta.email);
      return {
        title: "Workspace Joined",
        body: email
          ? `${email} joined the workspace.`
          : "A new member joined the workspace.",
      };
    }
    case "tenant.mail.outgoing.sent": {
      const to = asString(meta.to);
      const subject = asString(meta.subject);
      return {
        title: "Message Sent",
        body: to
          ? `${actorLabel} sent ${subject ? `"${subject}" ` : ""}to ${to}.`
          : `${actorLabel} sent a message.`,
      };
    }
    default:
      return {
        title: log.action,
        body: `${actorLabel} updated ${log.entity}.`,
      };
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const takeRaw = Number(url.searchParams.get("take") || 30);
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 100) : 30;

    const logs = await prisma.auditLog.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        actorUserId: true,
        meta: true,
        createdAt: true,
      },
    });

    const actorIds = Array.from(
      new Set(logs.map((log) => log.actorUserId).filter((id): id is number => Boolean(id)))
    );

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            tenantId: auth.tenantId,
            id: { in: actorIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    const notifications = logs.map((log) => {
      const actor = log.actorUserId ? actorMap.get(log.actorUserId) : null;
      const actorLabel = actor?.name || actor?.email || "System";
      const parsed = buildMessage(log, actorLabel);

      return {
        id: log.id.toString(),
        action: log.action,
        title: parsed.title,
        body: parsed.body,
        actorName: actorLabel,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("GET /api/tenant/notifications failed:", error);
    return NextResponse.json(
      {
        success: true,
        notifications: [],
        degraded: true,
        error: "Notifications are temporarily unavailable",
      },
      { status: 200 }
    );
  }
}
