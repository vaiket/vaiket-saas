ALTER TABLE "IncomingEmail"
ADD COLUMN "tenantId" INTEGER;

UPDATE "IncomingEmail"
SET "tenantId" = 1
WHERE "tenantId" IS NULL;

ALTER TABLE "IncomingEmail"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "IncomingEmail"
ADD CONSTRAINT "IncomingEmail_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
