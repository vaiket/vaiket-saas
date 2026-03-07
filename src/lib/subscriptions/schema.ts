import { prisma } from "@/lib/prisma";

let ensureBillingSchemaPromise: Promise<void> | null = null;

async function execute(sql: string) {
  await prisma.$executeRawUnsafe(sql);
}

async function ensureBillingSchemaImpl() {
  await execute(`
    CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
      "id" SERIAL NOT NULL,
      "key" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "priceMonth" INTEGER NOT NULL,
      "priceYear" INTEGER,
      "features" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS "UserSubscription" (
      "id" SERIAL NOT NULL,
      "userId" INTEGER NOT NULL,
      "tenantId" INTEGER NOT NULL,
      "planKey" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "startedAt" TIMESTAMP(3),
      "endsAt" TIMESTAMP(3),
      "paymentRef" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
      "amountPaid" INTEGER,
      CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
    );
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS "PaymentLog" (
      "id" SERIAL NOT NULL,
      "tenantId" INTEGER NOT NULL,
      "userId" INTEGER,
      "provider" TEXT NOT NULL,
      "providerRef" TEXT,
      "amount" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'INR',
      "status" TEXT NOT NULL,
      "meta" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
    );
  `);

  await execute(`ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'monthly';`);
  await execute(`ALTER TABLE "UserSubscription" ADD COLUMN IF NOT EXISTS "amountPaid" INTEGER;`);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'SubscriptionPlan_key_key'
      ) THEN
        CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");
      END IF;
    END $$;
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UserSubscription_userId_fkey'
      ) THEN
        ALTER TABLE "UserSubscription"
          ADD CONSTRAINT "UserSubscription_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UserSubscription_tenantId_fkey'
      ) THEN
        ALTER TABLE "UserSubscription"
          ADD CONSTRAINT "UserSubscription_tenantId_fkey"
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

export async function ensureBillingSchema() {
  if (!ensureBillingSchemaPromise) {
    ensureBillingSchemaPromise = ensureBillingSchemaImpl().catch((error) => {
      ensureBillingSchemaPromise = null;
      throw error;
    });
  }

  return ensureBillingSchemaPromise;
}
