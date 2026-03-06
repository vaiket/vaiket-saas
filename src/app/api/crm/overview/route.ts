import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { clamp, parseDateOrNull } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type CountRow = { total: bigint | number };
type StageRow = { stage: string; total: bigint | number; amount: string | number | null };
type TimelineRow = {
  id: string;
  action: string;
  entity_type: string;
  description: string | null;
  created_at: Date;
};
type TeamPerfRow = {
  user_id: number;
  user_name: string | null;
  leads_assigned: bigint | number;
  deals_owner: bigint | number;
  tasks_pending: bigint | number;
};

function toNumber(value: bigint | number | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const rangeDays = clamp(url.searchParams.get("rangeDays"), 30, 1, 365);
  const from = parseDateOrNull(url.searchParams.get("from"));
  const to = parseDateOrNull(url.searchParams.get("to")) ?? new Date();
  const fromDate = from ?? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const [
    leadCountRows,
    clientCountRows,
    dealCountRows,
    followUpRows,
    appointmentsTodayRows,
    wonRows,
    lostRows,
    stageRows,
    timelineRows,
    teamRows,
    tasksDueRows,
    recentConversations,
  ] = await Promise.all([
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_clients
        WHERE tenant_id = ${auth.tenantId}
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_deals
        WHERE tenant_id = ${auth.tenantId}
          AND stage NOT IN ('Closed Won', 'Closed Lost')
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_tasks
        WHERE tenant_id = ${auth.tenantId}
          AND status NOT IN ('Completed', 'Cancelled')
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_appointments
        WHERE tenant_id = ${auth.tenantId}
          AND DATE(start_at AT TIME ZONE 'UTC') = DATE(NOW() AT TIME ZONE 'UTC')
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
          AND status = 'Won'
      `
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
          AND status = 'Lost'
      `
    ),
    prisma.$queryRaw<StageRow[]>(
      Prisma.sql`
        SELECT
          stage,
          COUNT(*)::bigint AS total,
          COALESCE(SUM(value), 0) AS amount
        FROM crm_deals
        WHERE tenant_id = ${auth.tenantId}
        GROUP BY stage
        ORDER BY stage ASC
      `
    ),
    prisma.$queryRaw<TimelineRow[]>(
      Prisma.sql`
        SELECT
          id,
          action,
          entity_type,
          description,
          created_at
        FROM crm_activity_logs
        WHERE tenant_id = ${auth.tenantId}
        ORDER BY created_at DESC
        LIMIT 25
      `
    ),
    prisma.$queryRaw<TeamPerfRow[]>(
      Prisma.sql`
        SELECT
          u.id AS user_id,
          u.name AS user_name,
          COALESCE(l.leads_assigned, 0)::bigint AS leads_assigned,
          COALESCE(d.deals_owner, 0)::bigint AS deals_owner,
          COALESCE(t.tasks_pending, 0)::bigint AS tasks_pending
        FROM "User" u
        LEFT JOIN (
          SELECT assigned_user_id, COUNT(*)::bigint AS leads_assigned
          FROM crm_leads
          WHERE tenant_id = ${auth.tenantId}
            AND assigned_user_id IS NOT NULL
          GROUP BY assigned_user_id
        ) l ON l.assigned_user_id = u.id
        LEFT JOIN (
          SELECT assigned_user_id, COUNT(*)::bigint AS deals_owner
          FROM crm_deals
          WHERE tenant_id = ${auth.tenantId}
            AND assigned_user_id IS NOT NULL
            AND stage NOT IN ('Closed Won', 'Closed Lost')
          GROUP BY assigned_user_id
        ) d ON d.assigned_user_id = u.id
        LEFT JOIN (
          SELECT assigned_user_id, COUNT(*)::bigint AS tasks_pending
          FROM crm_tasks
          WHERE tenant_id = ${auth.tenantId}
            AND assigned_user_id IS NOT NULL
            AND status NOT IN ('Completed', 'Cancelled')
          GROUP BY assigned_user_id
        ) t ON t.assigned_user_id = u.id
        WHERE u."tenantId" = ${auth.tenantId}
          AND u.status = 'active'
        ORDER BY leads_assigned DESC, deals_owner DESC, tasks_pending DESC
        LIMIT 10
      `
    ),
    prisma.$queryRaw<
      Array<{ id: string; title: string; due_date: Date | null; priority: string; status: string }>
    >(
      Prisma.sql`
        SELECT id, title, due_date, priority, status
        FROM crm_tasks
        WHERE tenant_id = ${auth.tenantId}
          AND status NOT IN ('Completed', 'Cancelled')
          AND due_date IS NOT NULL
        ORDER BY due_date ASC
        LIMIT 12
      `
    ),
    prisma.waConversation.findMany({
      where: {
        tenantId: auth.tenantId,
        lastMessageAt: {
          gte: fromDate,
          lte: to,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            text: true,
            direction: true,
            createdAt: true,
            messageType: true,
          },
        },
      },
    }),
  ]);

  const totalLeads = toNumber(leadCountRows[0]?.total);
  const totalClients = toNumber(clientCountRows[0]?.total);
  const activeDeals = toNumber(dealCountRows[0]?.total);
  const upcomingFollowUps = toNumber(followUpRows[0]?.total);
  const appointmentsToday = toNumber(appointmentsTodayRows[0]?.total);
  const won = toNumber(wonRows[0]?.total);
  const lost = toNumber(lostRows[0]?.total);
  const closed = won + lost;
  const conversionRate = closed > 0 ? (won / closed) * 100 : 0;

  return NextResponse.json({
    success: true,
    range: {
      from: fromDate.toISOString(),
      to: to.toISOString(),
      days: rangeDays,
    },
    summary: {
      totalLeads,
      totalClients,
      activeDeals,
      upcomingFollowUps,
      appointmentsToday,
      conversionRate: Number(conversionRate.toFixed(2)),
    },
    pipeline: stageRows.map((row) => ({
      stage: row.stage,
      total: toNumber(row.total),
      amount: toNumber(row.amount),
    })),
    tasksDueSoon: tasksDueRows.map((row) => ({
      id: row.id,
      title: row.title,
      dueDate: row.due_date ? row.due_date.toISOString() : null,
      priority: row.priority,
      status: row.status,
    })),
    recentWhatsAppConversations: recentConversations.map((conversation) => {
      const latest = conversation.messages[0];
      return {
        id: conversation.id,
        status: conversation.status,
        contactId: conversation.contact.id,
        contactName: conversation.contact.name,
        contactPhone: conversation.contact.phone,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        latestMessage: latest
          ? {
              text: latest.text,
              direction: latest.direction,
              messageType: latest.messageType,
              createdAt: latest.createdAt.toISOString(),
            }
          : null,
      };
    }),
    teamPerformance: teamRows.map((row) => ({
      userId: row.user_id,
      name: row.user_name || "User",
      leadsAssigned: toNumber(row.leads_assigned),
      dealsOwner: toNumber(row.deals_owner),
      tasksPending: toNumber(row.tasks_pending),
    })),
    recentActivity: timelineRows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      description: row.description,
      createdAt: row.created_at.toISOString(),
    })),
  });
}
