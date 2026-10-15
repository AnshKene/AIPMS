-- Migration: Fix Risks RLS Policies and Project-Level Authorization
-- Migration ID: 20261011220000_fix_risks_rls_policies.sql

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

-- ─── 3. SELECT: Permitted Project Owners and Project Team Members ──────────────
-- Denies access to users not belonging to the project.
-- Guessing or knowing a risk UUID does not grant visibility.
CREATE POLICY "risks_select_project_access"
  ON public.risks
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

-- ─── 4. INSERT: Authorized Project Members & Managers (Excludes VIEWER) ───────
-- Validates access to the referenced project.
-- Enforces that read-only viewers cannot create risks.
CREATE POLICY "risks_insert_project_access"
  ON public.risks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
    AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') != 'VIEWER'
  );

-- ─── 5. UPDATE: Authorized Project Members & Managers (Excludes VIEWER) ───────
-- USING: Validates authorization on the existing risk and project.
-- WITH CHECK: Validates authorization on the target project (prevents moving to unauthorized project).
CREATE POLICY "risks_update_project_access"
  ON public.risks
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
    AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') != 'VIEWER'
  )
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
    AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') != 'VIEWER'
  );

-- ─── 6. DELETE: Project Managers & Administrators with Project Access ─────────
-- Denies TEAM_MEMBER and VIEWER from deleting risks, reinforcing backend RolesGuard.
CREATE POLICY "risks_delete_project_access"
  ON public.risks
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
    AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') NOT IN ('VIEWER', 'TEAM_MEMBER')
  );

-- ─── 7. Verify Function Execution Permissions ─────────────────────────────────
GRANT EXECUTE ON FUNCTION public.aipms_user_has_project_access(uuid) TO authenticated;
