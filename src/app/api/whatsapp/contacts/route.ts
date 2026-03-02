import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext, hasRoleAtLeast } from "@/lib/auth/session";
import { ensureWhatsAppSubscriptionAccess } from "@/lib/subscriptions/whatsapp-gate";

type UpsertContactBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  tags?: unknown;
  optedIn?: unknown;
};

function normalizePhone(value: unknown) {
  return String(value ?? "").trim().replace(/[^\d+]/g, "");
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;
  return email;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

  const contacts = await prisma.waContact.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(search
        ? {
            OR: [
              { phone: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      waId: true,
      tags: true,
      optedIn: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          conversations: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, contacts });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRoleAtLeast(auth.role, "member")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const subscriptionBlocked = await ensureWhatsAppSubscriptionAccess(auth);
  if (subscriptionBlocked) return subscriptionBlocked;

  const body = (await req.json()) as UpsertContactBody;
  const phone = normalizePhone(body.phone);
  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const address = normalizeOptional(body.address);

  if (!phone) {
    return NextResponse.json(
      { success: false, error: "phone is required" },
      { status: 400 }
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email format" },
      { status: 400 }
    );
  }

  const tags = normalizeTags(body.tags);
  const optedIn = Boolean(body.optedIn);

  const contact = await prisma.waContact.upsert({
    where: {
      tenantId_phone: {
        tenantId: auth.tenantId,
        phone,
      },
    },
    create: {
      tenantId: auth.tenantId,
      name: name || null,
      phone,
      email,
      address,
      tags,
      source: "manual",
      optedIn,
    },
    update: {
      name: name || null,
      email,
      address,
      tags,
      optedIn,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      tags: true,
      optedIn: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    action: "tenant.whatsapp.contact.upsert",
    entity: "WaContact",
    entityId: contact.id,
    meta: {
      phone: contact.phone,
      email: contact.email,
      optedIn: contact.optedIn,
      tags: contact.tags,
    },
    req,
  });

  return NextResponse.json({ success: true, contact });
}
