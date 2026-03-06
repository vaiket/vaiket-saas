import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureCrmAccess } from "@/lib/crm/auth";
import { createCrmNotification, trackCrmActivity } from "@/lib/crm/activity";
import { asArray, asRecord, normalizePhoneKey, readText } from "@/lib/crm/helpers";
import { prisma } from "@/lib/prisma";

type ImportRow = {
  name: string;
  phoneNumber: string;
  email: string | null;
  company: string | null;
  source: string;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseRowsFromCsv(raw: string): ImportRow[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
  const rows: ImportRow[] = [];

  const nameIndex = header.findIndex((item) => item === "name");
  const phoneIndex = header.findIndex((item) => ["phone", "phone_number", "mobile"].includes(item));
  const emailIndex = header.findIndex((item) => item === "email");
  const companyIndex = header.findIndex((item) => item === "company");
  const sourceIndex = header.findIndex((item) => item === "source");

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const name = readText(cells[nameIndex]);
    const phoneNumber = readText(cells[phoneIndex]);
    if (!name && !phoneNumber) continue;
    rows.push({
      name: name || "Unknown Lead",
      phoneNumber,
      email: readText(cells[emailIndex]) || null,
      company: readText(cells[companyIndex]) || null,
      source: readText(cells[sourceIndex]) || "Import",
    });
  }

  return rows;
}

function parseRowsFromJson(rawRows: unknown): ImportRow[] {
  return asArray<Record<string, unknown>>(rawRows)
    .map((row) => ({
      name: readText(row.name) || "Unknown Lead",
      phoneNumber: readText(row.phoneNumber ?? row.phone),
      email: readText(row.email) || null,
      company: readText(row.company) || null,
      source: readText(row.source) || "Import",
    }))
    .filter((row) => Boolean(row.name || row.phoneNumber));
}

export async function POST(req: Request) {
  const guard = await ensureCrmAccess(req, "member");
  if (!guard.ok) return guard.response;
  const { auth } = guard;

  const body = asRecord(await req.json().catch(() => ({})));
  const csv = readText(body.csv);
  const rows = csv ? parseRowsFromCsv(csv) : parseRowsFromJson(body.rows);

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid rows found for import" },
      { status: 400 }
    );
  }

  const normalizedRows = rows.slice(0, 5000);
  const uniquePhoneKeys = Array.from(
    new Set(normalizedRows.map((row) => normalizePhoneKey(row.phoneNumber)).filter(Boolean))
  );

  const existingPhoneRows = uniquePhoneKeys.length
    ? await prisma.$queryRaw<Array<{ phone_key: string }>>(
        Prisma.sql`
          SELECT phone_key
          FROM crm_leads
          WHERE tenant_id = ${auth.tenantId}
            AND phone_key IN (${Prisma.join(uniquePhoneKeys.map((item) => Prisma.sql`${item}`))})
        `
      )
    : [];

  const existingSet = new Set(existingPhoneRows.map((row) => row.phone_key));
  let createdCount = 0;
  let skippedDuplicates = 0;

  for (const row of normalizedRows) {
    const phoneKey = normalizePhoneKey(row.phoneNumber);
    if (phoneKey && existingSet.has(phoneKey)) {
      skippedDuplicates += 1;
      continue;
    }

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO crm_leads (
          id,
          tenant_id,
          name,
          phone_number,
          phone_key,
          email,
          company,
          source,
          status,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${auth.tenantId},
          ${row.name},
          ${row.phoneNumber || null},
          ${phoneKey},
          ${row.email},
          ${row.company},
          ${row.source || "Import"},
          ${"New Lead"},
          ${auth.userId},
          NOW(),
          NOW()
        )
      `
    );

    if (phoneKey) existingSet.add(phoneKey);
    createdCount += 1;
  }

  await Promise.all([
    trackCrmActivity({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "lead",
      action: "lead.import",
      description: `${createdCount} leads imported`,
      meta: { inputRows: rows.length, createdCount, skippedDuplicates },
    }),
    createCrmNotification({
      tenantId: auth.tenantId,
      kind: "lead_import",
      title: "Lead import completed",
      body: `${createdCount} leads added, ${skippedDuplicates} duplicates skipped.`,
      payload: { createdCount, skippedDuplicates },
    }),
  ]);

  return NextResponse.json({
    success: true,
    imported: createdCount,
    skippedDuplicates,
    processedRows: normalizedRows.length,
  });
}
