-- Migration: Harden projects table RLS policies
-- Purpose:   Prevent unauthorized cross-tenant project visibility and enforce strict ownership/membership isolation
-- Description: Replaces the permissive projects_select_authenticated policy (USING true) with
--              a tenant-isolated policy requiring project ownership, legitimate team membership,
--              or administrator / service_role privileges.

-- 1. Drop the legacy permissive select policy
DROP POLICY IF EXISTS "projects_select_authenticated" ON "public"."projects";
DROP POLICY IF EXISTS "projects_select_authorized" ON "public"."projects";

-- 2. Create hardened SELECT policy
CREATE POLICY "projects_select_authorized"
  ON "public"."projects"
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
        AND t.project_id = projects.id
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- 3. Ensure INSERT, UPDATE, DELETE also allow authorized administrators and service_role alongside project owner
DROP POLICY IF EXISTS "projects_insert_owner" ON "public"."projects";
CREATE POLICY "projects_insert_owner"
  ON "public"."projects"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "projects_update_owner" ON "public"."projects";
CREATE POLICY "projects_update_owner"
  ON "public"."projects"
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

DROP POLICY IF EXISTS "projects_delete_owner" ON "public"."projects";
CREATE POLICY "projects_delete_owner"
  ON "public"."projects"
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
