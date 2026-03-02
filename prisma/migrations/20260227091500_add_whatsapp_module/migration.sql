-- WhatsApp module foundation tables (tenant-scoped)

CREATE TABLE "wa_accounts" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "wabaId" TEXT NOT NULL,
  "businessId" TEXT,
  "accessToken" TEXT,
  "webhookVerifyToken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "qualityRating" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_contacts" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "waId" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source" TEXT,
  "optedIn" BOOLEAN NOT NULL DEFAULT false,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_conversations" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "accountId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "assignedUserId" INTEGER,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_messages" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "conversationId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "text" TEXT,
  "mediaUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "providerMessageId" TEXT,
  "sentByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  CONSTRAINT "wa_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_workflows" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "triggerConfig" JSONB,
  "actionConfig" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_workflow_runs" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "workflowId" TEXT NOT NULL,
  "conversationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "wa_workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wa_bot_rules" (
  "id" TEXT NOT NULL,
  "tenantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "matchType" TEXT NOT NULL DEFAULT 'keyword',
  "pattern" TEXT,
  "responseType" TEXT NOT NULL DEFAULT 'text',
  "responseText" TEXT,
  "handoverToHuman" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_bot_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_accounts_tenant_phone_unique" ON "wa_accounts"("tenantId", "phoneNumber");
CREATE UNIQUE INDEX "wa_accounts_tenant_phone_id_unique" ON "wa_accounts"("tenantId", "phoneNumberId");
CREATE INDEX "wa_accounts_tenant_status_idx" ON "wa_accounts"("tenantId", "status");

CREATE UNIQUE INDEX "wa_contacts_tenant_phone_unique" ON "wa_contacts"("tenantId", "phone");
CREATE INDEX "wa_contacts_tenant_last_message_idx" ON "wa_contacts"("tenantId", "lastMessageAt");

CREATE UNIQUE INDEX "wa_conversations_unique_contact_per_account" ON "wa_conversations"("tenantId", "accountId", "contactId");
CREATE INDEX "wa_conversations_tenant_status_last_message_idx" ON "wa_conversations"("tenantId", "status", "lastMessageAt");

CREATE INDEX "wa_messages_tenant_created_idx" ON "wa_messages"("tenantId", "createdAt");
CREATE INDEX "wa_messages_conversation_created_idx" ON "wa_messages"("conversationId", "createdAt");

CREATE INDEX "wa_workflows_tenant_active_created_idx" ON "wa_workflows"("tenantId", "isActive", "createdAt");
CREATE INDEX "wa_workflow_runs_tenant_status_started_idx" ON "wa_workflow_runs"("tenantId", "status", "startedAt");
CREATE INDEX "wa_workflow_runs_workflow_started_idx" ON "wa_workflow_runs"("workflowId", "startedAt");

CREATE INDEX "wa_bot_rules_tenant_active_priority_idx" ON "wa_bot_rules"("tenantId", "isActive", "priority");

ALTER TABLE "wa_accounts"
  ADD CONSTRAINT "wa_accounts_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_contacts"
  ADD CONSTRAINT "wa_contacts_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_conversations"
  ADD CONSTRAINT "wa_conversations_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_conversations"
  ADD CONSTRAINT "wa_conversations_account_fkey"
  FOREIGN KEY ("accountId") REFERENCES "wa_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_conversations"
  ADD CONSTRAINT "wa_conversations_contact_fkey"
  FOREIGN KEY ("contactId") REFERENCES "wa_contacts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_messages"
  ADD CONSTRAINT "wa_messages_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_messages"
  ADD CONSTRAINT "wa_messages_conversation_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "wa_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_messages"
  ADD CONSTRAINT "wa_messages_account_fkey"
  FOREIGN KEY ("accountId") REFERENCES "wa_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_workflows"
  ADD CONSTRAINT "wa_workflows_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_workflow_runs"
  ADD CONSTRAINT "wa_workflow_runs_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_workflow_runs"
  ADD CONSTRAINT "wa_workflow_runs_workflow_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "wa_workflows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_bot_rules"
  ADD CONSTRAINT "wa_bot_rules_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
