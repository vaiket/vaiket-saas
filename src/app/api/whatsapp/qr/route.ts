import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type UpsertBody = {
  accountId?: unknown;
  messageText?: unknown;
  title?: unknown;
  subtitle?: unknown;
  businessName?: unknown;
  contactNumber?: unknown;
};

type QrRow = {
  id: string;
  account_id: string;
  message_text: string;
  title: string;
  subtitle: string;
  business_name: string;
  contact_number: string;
  created_at: Date;
  updated_at: Date;
};

let ensureQrTablePromise: Promise<void> | null = null;

async function ensureQrTable() {
  if (!ensureQrTablePromise) {
    ensureQrTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS wa_qr_codes (
          id TEXT PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          message_text TEXT NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          business_name TEXT NOT NULL,
          contact_number TEXT NOT NULL,
          created_by_user_id INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, account_id)
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS wa_qr_codes_tenant_updated_idx
        ON wa_qr_codes (tenant_id, updated_at DESC);
      `);
    })();
  }

  await ensureQrTablePromise;
}

function toQrResponse(row: QrRow) {
  return {
    id: row.id,
    accountId: row.account_id,
    messageText: row.message_text,
    title: row.title,
    subtitle: row.subtitle,
    businessName: row.business_name,
    contactNumber: row.contact_number,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function readText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const url = new URL(req.url);
  const accountId = readText(url.searchParams.get("accountId"));
  if (!accountId) {
    return NextResponse.json(
      { success: false, error: "accountId is required" },
      { status: 400 }
    );
  }

  await ensureQrTable();

  const rows = await prisma.$queryRaw<QrRow[]>(
    Prisma.sql`
      SELECT
        id,
        account_id,
        message_text,
        title,
        subtitle,
        business_name,
        contact_number,
        created_at,
        updated_at
      FROM wa_qr_codes
      WHERE tenant_id = ${auth.tenantId}
        AND account_id = ${accountId}
      LIMIT 1
    `
  );

  const row = rows[0];
  return NextResponse.json({
    success: true,
    qrCode: row ? toQrResponse(row) : null,
  });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as UpsertBody;

  const accountId = readText(body.accountId);
  const messageText = readText(body.messageText);
  const title = readText(body.title);
  const subtitle = readText(body.subtitle);
  const businessName = readText(body.businessName);
  const contactNumber = readText(body.contactNumber);

  if (!accountId || !messageText || !title || !subtitle || !businessName || !contactNumber) {
    return NextResponse.json(
      {
        success: false,
        error:
          "accountId, messageText, title, subtitle, businessName and contactNumber are required",
      },
      { status: 400 }
    );
  }

  if (contactNumber.replace(/[^\d]/g, "").length < 8) {
    return NextResponse.json(
      { success: false, error: "contactNumber is invalid" },
      { status: 400 }
    );
  }

  await ensureQrTable();

  const id = crypto.randomUUID();
  const rows = await prisma.$queryRaw<QrRow[]>(
    Prisma.sql`
      INSERT INTO wa_qr_codes (
        id,
        tenant_id,
        account_id,
        message_text,
        title,
        subtitle,
        business_name,
        contact_number,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${auth.tenantId},
        ${accountId},
        ${messageText},
        ${title},
        ${subtitle},
        ${businessName},
        ${contactNumber},
        ${auth.userId},
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, account_id)
      DO UPDATE SET
        message_text = EXCLUDED.message_text,
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        business_name = EXCLUDED.business_name,
        contact_number = EXCLUDED.contact_number,
        updated_at = NOW()
      RETURNING
        id,
        account_id,
        message_text,
        title,
        subtitle,
        business_name,
        contact_number,
        created_at,
        updated_at
    `
  );

  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { success: false, error: "Failed to save QR code details" },
      { status: 500 }
    );
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.qr.save",
    entity: "wa_qr_codes",
    entityId: row.id,
    meta: {
      accountId,
      businessName,
    },
    req,
  });

  return NextResponse.json({
    success: true,
    qrCode: toQrResponse(row),
  });
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "admin")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const url = new URL(req.url);
  const accountId = readText(url.searchParams.get("accountId"));
  if (!accountId) {
    return NextResponse.json(
      { success: false, error: "accountId is required" },
      { status: 400 }
    );
  }

  await ensureQrTable();

  const rows = await prisma.$queryRaw<QrRow[]>(
    Prisma.sql`
      DELETE FROM wa_qr_codes
      WHERE tenant_id = ${auth.tenantId}
        AND account_id = ${accountId}
      RETURNING
        id,
        account_id,
        message_text,
        title,
        subtitle,
        business_name,
        contact_number,
        created_at,
        updated_at
    `
  );

  const deleted = rows[0] ?? null;

  if (deleted) {
    await writeAuditLog({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: "tenant.whatsapp.qr.delete",
      entity: "wa_qr_codes",
      entityId: deleted.id,
      meta: {
        accountId,
      },
      req,
    });
  }

  return NextResponse.json({
    success: true,
    deleted: Boolean(deleted),
  });
}
