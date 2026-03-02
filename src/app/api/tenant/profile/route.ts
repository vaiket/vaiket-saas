import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getAuthContext } from "@/lib/auth/session";

type ProfileBody = {
  name?: unknown;
  displayName?: unknown;
  website?: unknown;
  supportEmail?: unknown;
  phone?: unknown;
  timezone?: unknown;
  country?: unknown;
  billingAddress?: unknown;
  taxId?: unknown;
  invoicePrefix?: unknown;
  senderName?: unknown;
  replyToEmail?: unknown;
  status?: unknown;
};

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  const parsed = String(value).trim();
  return parsed.length ? parsed : null;
}

function readRequiredName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const parsed = String(value).trim();
  return parsed.length ? parsed : "";
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: {
        id: true,
        name: true,
        displayName: true,
        website: true,
        supportEmail: true,
        phone: true,
        timezone: true,
        country: true,
        billingAddress: true,
        taxId: true,
        invoicePrefix: true,
        senderName: true,
        replyToEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: tenant,
      canEdit: auth.role === "owner",
    });
  } catch (err) {
    console.error("GET /api/tenant/profile failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load tenant profile",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (auth.role !== "owner") {
      return NextResponse.json(
        {
          success: false,
          error: "Only owner can edit tenant profile",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as ProfileBody;
    const tenantName = readRequiredName(body.name);
    if (tenantName === "") {
      return NextResponse.json(
        { success: false, error: "Business name cannot be empty" },
        { status: 400 }
      );
    }

    const updateData: Prisma.TenantUpdateInput = {};

    if (tenantName !== undefined) updateData.name = tenantName;
    if (body.displayName !== undefined) updateData.displayName = readOptionalString(body.displayName);
    if (body.website !== undefined) updateData.website = readOptionalString(body.website);
    if (body.supportEmail !== undefined) updateData.supportEmail = readOptionalString(body.supportEmail);
    if (body.phone !== undefined) updateData.phone = readOptionalString(body.phone);
    if (body.timezone !== undefined) updateData.timezone = readOptionalString(body.timezone);
    if (body.country !== undefined) updateData.country = readOptionalString(body.country);
    if (body.billingAddress !== undefined) updateData.billingAddress = readOptionalString(body.billingAddress);
    if (body.taxId !== undefined) updateData.taxId = readOptionalString(body.taxId);
    if (body.invoicePrefix !== undefined) {
      const prefix = readOptionalString(body.invoicePrefix);
      if (prefix === null) {
        return NextResponse.json(
          { success: false, error: "Invoice prefix cannot be empty" },
          { status: 400 }
        );
      }
      updateData.invoicePrefix = prefix;
    }
    if (body.senderName !== undefined) updateData.senderName = readOptionalString(body.senderName);
    if (body.replyToEmail !== undefined) updateData.replyToEmail = readOptionalString(body.replyToEmail);
    if (body.status !== undefined && auth.role === "owner") {
      const status = readOptionalString(body.status);
      if (status && !["active", "suspended"].includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      if (status) updateData.status = status;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: auth.tenantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        displayName: true,
        website: true,
        supportEmail: true,
        phone: true,
        timezone: true,
        country: true,
        billingAddress: true,
        taxId: true,
        invoicePrefix: true,
        senderName: true,
        replyToEmail: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: "tenant.profile.update",
      entity: "Tenant",
      entityId: String(auth.tenantId),
      meta: {
        updatedFields: Object.keys(updateData),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Tenant profile updated",
      profile: updatedTenant,
    });
  } catch (err) {
    console.error("PUT /api/tenant/profile failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tenant profile",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
