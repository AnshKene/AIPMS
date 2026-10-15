-- Migration: Create Audit Logs Table and Security Policies
-- Purpose:   Establish durable server-side audit records for administrative and security-sensitive events.

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "actor_id" TEXT NOT NULL,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_resource" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "context" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index audit logs by timestamp, action, and actor for fast admin queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "public"."audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "public"."audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_id" ON "public"."audit_logs" ("actor_id");

-- Enable Row Level Security
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable select for authenticated admin users on audit_logs" ON "public"."audit_logs";
DROP POLICY IF EXISTS "Prevent user insert/update/delete on audit_logs" ON "public"."audit_logs";

-- Only authenticated users with ADMIN metadata/role or service_role can select audit logs
CREATE POLICY "audit_logs_select_admin_only"
  ON "public"."audit_logs"
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- Ordinary users cannot INSERT, UPDATE, or DELETE audit records (only server service role can insert)
