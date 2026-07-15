-- SolarCRM Database Schema
-- Applied by the installer via psql during first-time setup.
-- Generated from Drizzle ORM schema definitions.
-- All tables use IF NOT EXISTS so this script is safe to re-run.

-- ── Users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
    "id"            SERIAL PRIMARY KEY,
    "name"          TEXT NOT NULL,
    "email"         TEXT NOT NULL UNIQUE,
    "role"          TEXT NOT NULL DEFAULT 'sales',
    "phone"         TEXT,
    "password_hash" TEXT,
    "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Leads ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "leads" (
    "id"                       SERIAL PRIMARY KEY,
    "customer_name"            TEXT NOT NULL,
    "mobile_number"            TEXT NOT NULL,
    "alternate_number"         TEXT,
    "email"                    TEXT,
    "city"                     TEXT,
    "address"                  TEXT,
    "lead_source"              TEXT,
    "stage"                    TEXT NOT NULL DEFAULT 'lead',
    "follow_up_date"           TEXT,
    "follow_up_status"         TEXT,
    "assigned_sales_person_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "assigned_sales_person"    TEXT,
    "remarks"                  TEXT,
    "system_capacity_kw"       NUMERIC(8,2),
    "estimated_value"          NUMERIC(12,2),
    "created_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Lead Notes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lead_notes" (
    "id"              SERIAL PRIMARY KEY,
    "lead_id"         INTEGER NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
    "note"            TEXT NOT NULL,
    "created_by_id"   INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "created_by"      TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "projects" (
    "id"                   SERIAL PRIMARY KEY,
    "lead_id"              INTEGER REFERENCES "leads"("id") ON DELETE SET NULL,
    "customer_name"        TEXT NOT NULL,
    "customer_phone"       TEXT NOT NULL,
    "customer_email"       TEXT,
    "city"                 TEXT,
    "address"              TEXT,
    "system_capacity_kw"   NUMERIC(8,2),
    "panel_brand"          TEXT,
    "inverter_brand"       TEXT,
    "total_amount"         NUMERIC(12,2),
    "stage"                TEXT NOT NULL DEFAULT 'order_punched',
    "assigned_engineer_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "assigned_engineer"    TEXT,
    "remarks"              TEXT,
    "expected_completion"  TEXT,
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payments ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "payments" (
    "id"               SERIAL PRIMARY KEY,
    "project_id"       INTEGER NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "type"             TEXT NOT NULL,
    "amount"           NUMERIC(12,2) NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "payment_date"     TEXT,
    "payment_mode"     TEXT,
    "reference_number" TEXT,
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventory Items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "inventory_items" (
    "id"              SERIAL PRIMARY KEY,
    "name"            TEXT NOT NULL,
    "category"        TEXT NOT NULL,
    "sku"             TEXT,
    "unit"            TEXT NOT NULL,
    "current_stock"   NUMERIC(10,2) NOT NULL DEFAULT 0,
    "min_stock_level" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "max_stock_level" NUMERIC(10,2),
    "unit_cost"       NUMERIC(12,2),
    "supplier_name"   TEXT,
    "location"        TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventory Transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "inventory_transactions" (
    "id"            SERIAL PRIMARY KEY,
    "item_id"       INTEGER NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
    "project_id"    INTEGER REFERENCES "projects"("id") ON DELETE SET NULL,
    "type"          TEXT NOT NULL,
    "quantity"      NUMERIC(10,2) NOT NULL,
    "notes"         TEXT,
    "created_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Service Calls ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "service_calls" (
    "id"                   SERIAL PRIMARY KEY,
    "project_id"           INTEGER REFERENCES "projects"("id") ON DELETE SET NULL,
    "customer_name"        TEXT NOT NULL,
    "customer_phone"       TEXT NOT NULL,
    "address"              TEXT,
    "issue_description"    TEXT NOT NULL,
    "status"               TEXT NOT NULL DEFAULT 'open',
    "priority"             TEXT NOT NULL DEFAULT 'medium',
    "assigned_engineer_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "closure_notes"        TEXT,
    "scheduled_date"       TEXT,
    "closed_at"            TIMESTAMPTZ,
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Activities ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "activities" (
    "id"              SERIAL PRIMARY KEY,
    "entity_type"     TEXT NOT NULL,
    "entity_id"       INTEGER NOT NULL,
    "action"          TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "performed_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "metadata"        TEXT,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "documents" (
    "id"             SERIAL PRIMARY KEY,
    "file_name"      TEXT NOT NULL,
    "original_name"  TEXT NOT NULL,
    "file_type"      TEXT NOT NULL,
    "file_size"      INTEGER NOT NULL,
    "document_type"  TEXT NOT NULL,
    "object_path"    TEXT NOT NULL,
    "lead_id"        INTEGER REFERENCES "leads"("id") ON DELETE SET NULL,
    "project_id"     INTEGER REFERENCES "projects"("id") ON DELETE SET NULL,
    "uploaded_by_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "notes"          TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Settings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "settings" (
    "key"        TEXT PRIMARY KEY,
    "value"      TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Default settings ───────────────────────────────────────────────────────────
INSERT INTO "settings" ("key", "value") VALUES
    ('company_name',    'SunPower Solar'),
    ('company_phone',   ''),
    ('company_email',   ''),
    ('company_address', ''),
    ('lead_sources',    'Walk-in,Referral,Online,Cold Call,Dealer'),
    ('app_version',     '1.0.0')
ON CONFLICT ("key") DO NOTHING;

-- ── Performance indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_leads_stage"          ON "leads"("stage");
CREATE INDEX IF NOT EXISTS "idx_leads_follow_up_date" ON "leads"("follow_up_date");
CREATE INDEX IF NOT EXISTS "idx_projects_stage"       ON "projects"("stage");
CREATE INDEX IF NOT EXISTS "idx_payments_status"      ON "payments"("status");
CREATE INDEX IF NOT EXISTS "idx_payments_project_id"  ON "payments"("project_id");
CREATE INDEX IF NOT EXISTS "idx_activities_entity"    ON "activities"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_service_calls_status" ON "service_calls"("status");
CREATE INDEX IF NOT EXISTS "idx_inventory_category"   ON "inventory_items"("category");
