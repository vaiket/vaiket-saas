import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { readText, toCsvRow } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type ExportType = "leads" | "clients" | "deals";

function asExportType(value: string): ExportType {
  if (value === "clients") return "clients";
  if (value === "deals") return "deals";
  return "leads";
}

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const exportType = asExportType(readText(url.searchParams.get("type")).toLowerCase());
  const format = readText(url.searchParams.get("format")).toLowerCase() === "excel" ? "excel" : "csv";

  let headers: string[] = [];
  let rows: string[] = [];

  if (exportType === "clients") {
    const clients = await prisma.$queryRaw<
      Array<{
        name: string;
        phone_number: string | null;
        email: string | null;
        company: string | null;
        address: string | null;
        created_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT name, phone_number, email, company, address, created_at
        FROM crm_clients
        WHERE tenant_id = ${auth.tenantId}
        ORDER BY created_at DESC
      `
    );
    headers = ["Name", "Phone", "Email", "Company", "Address", "Created At"];
    rows = clients.map((client) =>
      toCsvRow([
        client.name,
        client.phone_number,
        client.email,
        client.company,
        client.address,
        client.created_at.toISOString(),
      ])
    );
  } else if (exportType === "deals") {
    const deals = await prisma.$queryRaw<
      Array<{
        title: string;
        stage: string;
        value: string | number;
        expected_closing_date: Date | null;
        created_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT title, stage, value, expected_closing_date, created_at
        FROM crm_deals
        WHERE tenant_id = ${auth.tenantId}
        ORDER BY created_at DESC
      `
    );
    headers = ["Title", "Stage", "Value", "Expected Close", "Created At"];
    rows = deals.map((deal) =>
      toCsvRow([
        deal.title,
        deal.stage,
        deal.value,
        deal.expected_closing_date?.toISOString() ?? "",
        deal.created_at.toISOString(),
      ])
    );
  } else {
    const leads = await prisma.$queryRaw<
      Array<{
        name: string;
        phone_number: string | null;
        email: string | null;
        company: string | null;
        source: string;
        status: string;
        created_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT name, phone_number, email, company, source, status, created_at
        FROM crm_leads
        WHERE tenant_id = ${auth.tenantId}
        ORDER BY created_at DESC
      `
    );
    headers = ["Name", "Phone", "Email", "Company", "Source", "Status", "Created At"];
    rows = leads.map((lead) =>
      toCsvRow([
        lead.name,
        lead.phone_number,
        lead.email,
        lead.company,
        lead.source,
        lead.status,
        lead.created_at.toISOString(),
      ])
    );
  }

  const ext = format === "excel" ? "xls" : "csv";
  const contentType =
    format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8";

  const payload = [toCsvRow(headers), ...rows].join("\n");

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="vaiket-crm-${exportType}.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
