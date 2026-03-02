ALTER TABLE "wa_contacts"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "address" TEXT;

CREATE INDEX "wa_contacts_tenant_email_idx"
  ON "wa_contacts"("tenantId", "email");
