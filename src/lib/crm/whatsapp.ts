import { Prisma } from "@prisma/client";

import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { normalizePhoneKey, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";
import { ensureCrmSchema } from "@/lib/crm/schema";
import { sendMetaTextMessage } from "@/lib/whatsapp/meta";

type HandleInboundCrmAutomationArgs = {
  tenantId: number;
  accountId: string;
  conversationId: string;
  from: string;
  text: string;
  profileName?: string | null;
  phoneNumberId?: string | null;
  accessToken?: string | null;
};

type CrmLeadRow = {
  id: string;
  name: string;
  status: string;
  assigned_user_id: number | null;
};

type CrmRoleRow = {
  user_id: number;
};

async function pickSalesAssignee(tenantId: number) {
  const roleRows = await prisma.$queryRaw<CrmRoleRow[]>(
    Prisma.sql`
      SELECT r.user_id
      FROM crm_user_roles r
      JOIN "User" u
        ON u.id = r.user_id
      WHERE r.tenant_id = ${tenantId}
        AND r.role = 'Sales'
        AND u.status = 'active'
      ORDER BY r.updated_at DESC
      LIMIT 1
    `
  );
  if (roleRows[0]?.user_id) return roleRows[0].user_id;

  const fallback = await prisma.user.findFirst({
    where: {
      tenantId,
      status: "active",
      role: { in: ["owner", "admin", "member"] },
    },
    orderBy: [{ role: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  return fallback?.id ?? null;
}

function shouldSendWelcomeMessage() {
  const value = readText(process.env.CRM_AUTO_WELCOME_WHATSAPP).toLowerCase();
  if (!value) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return true;
}

export async function handleInboundCrmAutomation(args: HandleInboundCrmAutomationArgs) {
  const phoneKey = normalizePhoneKey(args.from);
  if (!phoneKey) return { createdLead: false, sentWelcome: false, reason: "invalid_phone" };

  await ensureCrmSchema();

  const existingRows = await prisma.$queryRaw<CrmLeadRow[]>(
    Prisma.sql`
      SELECT id, name, status, assigned_user_id
      FROM crm_leads
      WHERE tenant_id = ${args.tenantId}
        AND phone_key = ${phoneKey}
      LIMIT 1
    `
  );
  const existingLead = existingRows[0];
  if (existingLead) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE crm_leads
        SET updated_at = NOW()
        WHERE tenant_id = ${args.tenantId}
          AND id = ${existingLead.id}
      `
    );

    await trackCrmActivity({
      tenantId: args.tenantId,
      entityType: "lead",
      entityId: existingLead.id,
      action: "lead.whatsapp_message.received",
      description: `Inbound WhatsApp message from ${existingLead.name}`,
      meta: {
        accountId: args.accountId,
        conversationId: args.conversationId,
        snippet: args.text.slice(0, 240),
      },
    });

    return { createdLead: false, sentWelcome: false, leadId: existingLead.id };
  }

  const assignedUserId = await pickSalesAssignee(args.tenantId);
  const leadName = readText(args.profileName) || `WhatsApp ${args.from}`;

  const leadRows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO crm_leads (
        id,
        tenant_id,
        name,
        phone_number,
        phone_key,
        source,
        status,
        assigned_user_id,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${args.tenantId},
        ${leadName},
        ${args.from},
        ${phoneKey},
        ${"WhatsApp"},
        ${"New Lead"},
        ${assignedUserId},
        ${args.text ? `First inbound: ${args.text.slice(0, 500)}` : null},
        NOW(),
        NOW()
      )
      RETURNING id
    `
  );

  const leadId = leadRows[0]?.id;
  if (!leadId) {
    return { createdLead: false, sentWelcome: false, reason: "lead_insert_failed" };
  }

  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO crm_tasks (
        id,
        tenant_id,
        title,
        assigned_user_id,
        lead_id,
        due_date,
        priority,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${args.tenantId},
        ${"Follow up WhatsApp lead"},
        ${assignedUserId},
        ${leadId},
        ${dueDate},
        ${"High"},
        ${"Pending"},
        ${"Auto-created from WhatsApp inbound automation"},
        NOW(),
        NOW()
      )
    `
  );

  await Promise.all([
    trackCrmActivity({
      tenantId: args.tenantId,
      entityType: "lead",
      entityId: leadId,
      action: "lead.auto_created.whatsapp",
      description: `${leadName} auto-created from WhatsApp`,
      meta: {
        phone: args.from,
        accountId: args.accountId,
        conversationId: args.conversationId,
      },
    }),
    createCrmNotification({
      tenantId: args.tenantId,
      userId: assignedUserId,
      kind: "new_whatsapp_lead",
      title: "New WhatsApp lead assigned",
      body: `${leadName} sent a new message and was auto-assigned.`,
      payload: {
        leadId,
        accountId: args.accountId,
        conversationId: args.conversationId,
      },
    }),
  ]);

  let sentWelcome = false;
  if (shouldSendWelcomeMessage() && args.accessToken && args.phoneNumberId) {
    const welcomeText =
      process.env.CRM_WELCOME_WHATSAPP_TEXT?.trim() ||
      "Welcome to Vaiket CRM 👋 Thanks for reaching out. Our team will connect with you shortly.";

    const outboundMessage = await prisma.waMessage.create({
      data: {
        tenantId: args.tenantId,
        conversationId: args.conversationId,
        accountId: args.accountId,
        direction: "outbound",
        messageType: "text",
        text: welcomeText,
        status: "processing",
      },
      select: { id: true },
    });

    try {
      const sent = await sendMetaTextMessage({
        phoneNumberId: args.phoneNumberId,
        accessToken: args.accessToken,
        to: args.from,
        text: welcomeText,
      });
      await prisma.waMessage.update({
        where: { id: outboundMessage.id },
        data: {
          status: "sent",
          providerMessageId: sent.messageId,
        },
      });
      sentWelcome = true;
    } catch (error) {
      await prisma.waMessage.update({
        where: { id: outboundMessage.id },
        data: { status: "failed" },
      });
      await trackCrmActivity({
        tenantId: args.tenantId,
        entityType: "lead",
        entityId: leadId,
        action: "lead.auto_welcome.failed",
        description: "Auto welcome message failed",
        meta: { reason: error instanceof Error ? error.message : "unknown_error" },
      });
    }
  }

  return { createdLead: true, sentWelcome, leadId };
}
