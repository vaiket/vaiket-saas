function isValidE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(String(value || "").trim());
}

function isValidMetaId(value) {
  return /^\d{8,32}$/.test(String(value || "").trim());
}

function collectIssues(account) {
  const issues = [];
  if (!isValidE164(account.phoneNumber)) issues.push("invalid_phoneNumber");
  if (!isValidMetaId(account.phoneNumberId)) issues.push("invalid_phoneNumberId");
  if (!isValidMetaId(account.wabaId)) issues.push("invalid_wabaId");
  return issues;
}

function toSummary(accounts) {
  const byTenant = {};
  for (const row of accounts) {
    byTenant[row.tenantId] = (byTenant[row.tenantId] || 0) + 1;
  }
  return byTenant;
}

function findCrossTenantPhoneIdDuplicates(accounts) {
  const map = new Map();
  for (const row of accounts) {
    const key = String(row.phoneNumberId || "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      id: row.id,
      tenantId: row.tenantId,
      phoneNumber: row.phoneNumber,
      name: row.name,
      status: row.status,
    });
  }

  const duplicates = [];
  for (const [phoneNumberId, rows] of map.entries()) {
    if (rows.length <= 1) continue;
    const tenantCount = new Set(rows.map((r) => r.tenantId)).size;
    if (tenantCount <= 1) continue;
    duplicates.push({ phoneNumberId, rows });
  }
  return duplicates;
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const apply = process.argv.includes("--apply");

  try {
    const accounts = await prisma.waAccount.findMany({
      select: {
        id: true,
        tenantId: true,
        name: true,
        phoneNumber: true,
        phoneNumberId: true,
        wabaId: true,
        status: true,
        accessToken: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const invalidRows = accounts
      .map((row) => ({ ...row, issues: collectIssues(row) }))
      .filter((row) => row.issues.length > 0);
    const quarantinedRows = invalidRows.filter(
      (row) => row.status === "action_required" && !row.accessToken
    );
    const actionableInvalidRows = invalidRows.filter(
      (row) => !(row.status === "action_required" && !row.accessToken)
    );

    const duplicates = findCrossTenantPhoneIdDuplicates(accounts);

    console.log("=== WhatsApp Account Guard ===");
    console.log(
      JSON.stringify(
        {
          totalAccounts: accounts.length,
          tenants: toSummary(accounts),
          invalidRows: invalidRows.length,
          actionableInvalidRows: actionableInvalidRows.length,
          quarantinedRows: quarantinedRows.length,
          crossTenantDuplicatePhoneNumberIds: duplicates.length,
          mode: apply ? "apply" : "dry-run",
        },
        null,
        2
      )
    );

    if (actionableInvalidRows.length > 0) {
      console.log("\nActionable invalid rows:");
      for (const row of actionableInvalidRows) {
        console.log(
          `- id=${row.id} tenant=${row.tenantId} phone=${row.phoneNumber} phoneNumberId=${row.phoneNumberId} wabaId=${row.wabaId} issues=${row.issues.join(",")}`
        );
      }
    }

    if (quarantinedRows.length > 0) {
      console.log(`\nQuarantined invalid rows: ${quarantinedRows.length}`);
    }

    if (duplicates.length > 0) {
      console.log("\nCross-tenant duplicate phoneNumberId mappings:");
      for (const group of duplicates) {
        const compact = group.rows
          .map((row) => `tenant=${row.tenantId} id=${row.id} phone=${row.phoneNumber}`)
          .join(" | ");
        console.log(`- phoneNumberId=${group.phoneNumberId} -> ${compact}`);
      }
    }

    if (apply) {
      if (actionableInvalidRows.length === 0) {
        console.log("\nNo invalid rows found. No changes applied.");
      } else {
        const ids = actionableInvalidRows.map((row) => row.id);
        const updated = await prisma.waAccount.updateMany({
          where: { id: { in: ids } },
          data: {
            status: "action_required",
            accessToken: null,
            webhookVerifyToken: null,
            lastSyncAt: null,
          },
        });

        console.log(
          `\nApplied remediation to ${updated.count} rows (status=action_required, token cleared).`
        );
      }
    } else if (actionableInvalidRows.length > 0) {
      console.log("\nTo apply safe remediation, run: npm run wa:guard -- --apply");
    }

    if (!apply && (actionableInvalidRows.length > 0 || duplicates.length > 0)) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error("whatsapp-accounts-guard failed:", error);
    process.exitCode = 1;
  });
