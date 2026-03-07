ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "invitedByUserId" INTEGER,
    ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

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

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_jti_key" ON "UserSession"("jti");
CREATE INDEX IF NOT EXISTS "UserSession_userId_tenantId_idx" ON "UserSession"("userId", "tenantId");
CREATE INDEX IF NOT EXISTS "UserSession_tenantId_revokedAt_idx" ON "UserSession"("tenantId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_tenantId_expiresAt_idx" ON "UserSession"("tenantId", "expiresAt");

ALTER TABLE "UserSubscription"
    ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE "UserSubscription"
    ADD COLUMN IF NOT EXISTS "amountPaid" INTEGER;
