import { prisma } from "@/lib/prisma";

let ensureCrmSchemaPromise: Promise<void> | null = null;

const CRM_SCHEMA_SQL: string[] = [
  `
    CREATE TABLE IF NOT EXISTS crm_leads (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT,
      phone_key TEXT,
      email TEXT,
      company TEXT,
      source TEXT NOT NULL DEFAULT 'Manual',
      status TEXT NOT NULL DEFAULT 'New Lead',
      assigned_user_id INTEGER,
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      notes TEXT,
      created_by_user_id INTEGER,
      converted_client_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_clients (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      lead_id TEXT,
      name TEXT NOT NULL,
      phone_number TEXT,
      phone_key TEXT,
      email TEXT,
      company TEXT,
      address TEXT,
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      notes TEXT,
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_deals (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      client_id TEXT,
      lead_id TEXT,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'New Lead',
      value NUMERIC(14, 2) NOT NULL DEFAULT 0,
      assigned_user_id INTEGER,
      expected_closing_date DATE,
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      assigned_user_id INTEGER,
      client_id TEXT,
      lead_id TEXT,
      due_date TIMESTAMPTZ,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT,
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_appointments (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      client_id TEXT,
      lead_id TEXT,
      assigned_user_id INTEGER,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      reminder_sent_at TIMESTAMPTZ,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_tags (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366F1',
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_entity_tags (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      tag_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_activity_logs (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      actor_user_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      description TEXT,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_notifications (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS crm_user_roles (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'Sales',
      created_by_user_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `CREATE INDEX IF NOT EXISTS crm_leads_tenant_created_idx ON crm_leads (tenant_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS crm_leads_tenant_status_idx ON crm_leads (tenant_id, status);`,
  `CREATE INDEX IF NOT EXISTS crm_leads_tenant_assigned_idx ON crm_leads (tenant_id, assigned_user_id);`,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_tenant_phone_key_unique_idx
    ON crm_leads (tenant_id, phone_key)
    WHERE phone_key IS NOT NULL;
  `,
  `CREATE INDEX IF NOT EXISTS crm_clients_tenant_created_idx ON crm_clients (tenant_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS crm_clients_tenant_phone_idx ON crm_clients (tenant_id, phone_key);`,
  `CREATE INDEX IF NOT EXISTS crm_deals_tenant_stage_idx ON crm_deals (tenant_id, stage, updated_at DESC);`,
  `CREATE INDEX IF NOT EXISTS crm_tasks_tenant_due_idx ON crm_tasks (tenant_id, due_date, status);`,
  `CREATE INDEX IF NOT EXISTS crm_appointments_tenant_start_idx ON crm_appointments (tenant_id, start_at);`,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS crm_tags_tenant_name_unique_idx
    ON crm_tags (tenant_id, lower(name));
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS crm_entity_tags_unique_idx
    ON crm_entity_tags (tenant_id, tag_id, entity_type, entity_id);
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS crm_user_roles_tenant_user_unique_idx
    ON crm_user_roles (tenant_id, user_id);
  `,
  `CREATE INDEX IF NOT EXISTS crm_activity_logs_tenant_created_idx ON crm_activity_logs (tenant_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS crm_notifications_tenant_created_idx ON crm_notifications (tenant_id, created_at DESC);`,
  `
    INSERT INTO crm_tags (id, tenant_id, name, color, created_at, updated_at)
    SELECT
      md5(random()::text || clock_timestamp()::text),
      t.id,
      defaults.name,
      defaults.color,
      NOW(),
      NOW()
    FROM "Tenant" t
    CROSS JOIN (
      VALUES
        ('Hot Lead', '#EF4444'),
        ('VIP Client', '#7C3AED'),
        ('Follow-up Required', '#F59E0B'),
        ('Website Client', '#0EA5E9')
    ) AS defaults(name, color)
    ON CONFLICT DO NOTHING;
  `,
];

export async function ensureCrmSchema() {
  if (!ensureCrmSchemaPromise) {
    ensureCrmSchemaPromise = (async () => {
      for (const statement of CRM_SCHEMA_SQL) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      ensureCrmSchemaPromise = null;
      throw error;
    });
  }

  await ensureCrmSchemaPromise;
}
