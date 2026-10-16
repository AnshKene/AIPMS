-- Migration: Harden risks table RLS policies to eliminate user_metadata reliance (RLS Lint 0015)
-- Migration ID: 20261016180000_harden_risks_rls.sql
--
-- Purpose:
--   Removes reliance on user-editable auth.jwt() -> 'user_metadata' in public.risks policies.
--   Supabase Auth allows users to mutate their own user_metadata via client SDKs (supabase.auth.updateUser),
--   making any authorization logic relying on user_metadata bypassable by attackers.
--
-- Solution:
--   1. Authorize project operations using trusted database membership:
--      - Project owner in public.projects (owner_id = auth.uid())
--      - Team member in public.teams / public.team_members
--      - Checked efficiently via public.aipms_user_has_project_access(project_id)
--   2. Authorize global administrative roles using trusted server-managed app_metadata:
--      - (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
--      - (auth.jwt() ->> 'role') = 'service_role'
--   3. Exclude read-only VIEWER roles based strictly on trusted app_metadata (never user_metadata).

-- ─── 1. Ensure Row Level Security is Enabled on Risks ─────────────────────────
ALTER TABLE "public"."risks" ENABLE ROW LEVEL SECURITY;

-- ─── 2. Clean up any existing or conflicting policies (Idempotent) ────────────
DROP POLICY IF EXISTS "risks_select_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_insert_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_update_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_delete_project_access" ON "public"."risks";

DROP POLICY IF EXISTS "Enable read access for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable insert for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable update for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable delete for authenticated users on risks" ON "public"."risks";

-- ─── 3. SELECT: Project Owners, Team Members, and System Admins ───────────────
CREATE POLICY "risks_select_project_access"
  ON "public"."risks"
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- ─── 4. INSERT: Legitimate Project Members & Managers (Excludes VIEWER) ───────
-- Strictly checks database membership via aipms_user_has_project_access.
-- Uses server-managed app_metadata (never user-editable user_metadata) to check role.
CREATE POLICY "risks_insert_project_access"
  ON "public"."risks"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR (
      public.aipms_user_has_project_access(project_id)
      AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') != 'VIEWER'
    )
  );

-- ─── 5. UPDATE: Legitimate Project Members & Managers (Excludes VIEWER) ───────
CREATE POLICY "risks_update_project_access"
  ON "public"."risks"
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR (
      public.aipms_user_has_project_access(project_id)
      AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') != 'VIEWER'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR (
      public.aipms_user_has_project_access(project_id)
      AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') != 'VIEWER'
    )
  );

-- ─── 6. DELETE: Project Owners, Project Managers, and System Admins ───────────
-- Regular team members and read-only viewers cannot delete risks.
CREATE POLICY "risks_delete_project_access"
  ON "public"."risks"
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
    OR (
      -- Project owner can always delete risks within their project
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.owner_id = auth.uid()
      )
      OR (
        public.aipms_user_has_project_access(project_id)
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'PROJECT_MANAGER'
      )
    )
  );

-- ─── 7. Verify Function Permissions ───────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.aipms_user_has_project_access(uuid) TO authenticated;
