-- Migration: Harden audit_logs RLS policy to use trusted app_metadata
-- Purpose:   Prevent privilege escalation via user-editable user_metadata
-- Description: In Supabase, user_metadata is user-editable via the client SDK, whereas
--              app_metadata can only be updated by service_role/administrators.
--              This migration replaces the audit_logs select policy to require trusted
--              app_metadata role or service_role.

DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON "public"."audit_logs";

CREATE POLICY "audit_logs_select_admin_only"
  ON "public"."audit_logs"
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
