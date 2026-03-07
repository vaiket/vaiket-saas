import { prisma } from "@/lib/prisma";

let ensureAuthSchemaPromise: Promise<void> | null = null;

async function execute(sql: string) {
  await prisma.$executeRawUnsafe(sql);
}

async function ensureAuthSchemaImpl() {
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitedByUserId" INTEGER;`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" TIMESTAMP(3);`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;`);
  await execute(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;`);

  await execute(`
    CREATE TABLE IF NOT EXISTS "UserSession" (
      "id" TEXT NOT NULL,
      "userId" INTEGER NOT NULL,
      "tenantId" INTEGER NOT NULL,
      "jti" TEXT NOT NULL,
      "ip" TEXT,
      "userAgent" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "lastSeenAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
    );
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'UserSession_jti_key'
      ) THEN
        CREATE UNIQUE INDEX "UserSession_jti_key" ON "UserSession"("jti");
      END IF;
    END $$;
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'UserSession_userId_tenantId_idx'
      ) THEN
        CREATE INDEX "UserSession_userId_tenantId_idx" ON "UserSession"("userId", "tenantId");
      END IF;
    END $$;
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'UserSession_tenantId_revokedAt_idx'
      ) THEN
        CREATE INDEX "UserSession_tenantId_revokedAt_idx" ON "UserSession"("tenantId", "revokedAt");
      END IF;
    END $$;
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'UserSession_tenantId_expiresAt_idx'
      ) THEN
        CREATE INDEX "UserSession_tenantId_expiresAt_idx" ON "UserSession"("tenantId", "expiresAt");
      END IF;
    END $$;
  `);
}

export async function ensureAuthSchema() {
  if (!ensureAuthSchemaPromise) {
    ensureAuthSchemaPromise = ensureAuthSchemaImpl().catch((error) => {
      ensureAuthSchemaPromise = null;
      throw error;
    });
  }

  return ensureAuthSchemaPromise;
}
