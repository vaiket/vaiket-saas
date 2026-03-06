import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { readText, toCsvRow } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type LeadExportRow = {
  name: string;
  phone_number: string | null;
  email: string | null;
  company: string | null;
  source: string;
  status: string;
  created_at: Date;
};

export async function GET(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const url = new URL(req.url);
  const format = readText(url.searchParams.get("format")).toLowerCase() === "excel" ? "excel" : "csv";

  const leads = await prisma.$queryRaw<LeadExportRow[]>(
    Prisma.sql`
      SELECT
        name,
        phone_number,
        email,
        company,
        source,
        status,
        created_at
      FROM crm_leads
      WHERE tenant_id = ${auth.tenantId}
      ORDER BY created_at DESC
    `
  );

  const lines = [
    toCsvRow(["Name", "Phone", "Email", "Company", "Source", "Status", "Created At"]),
    ...leads.map((row) =>
      toCsvRow([
        row.name,
        row.phone_number,
        row.email,
        row.company,
        row.source,
        row.status,
        row.created_at.toISOString(),
      ])
    ),
  ];
  const csv = lines.join("\n");

  const ext = format === "excel" ? "xls" : "csv";
  const contentType =
    format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="vaiket-crm-leads.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
