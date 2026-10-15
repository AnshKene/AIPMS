-- Migration: Harden Teams & Team Members RLS Policies
-- Purpose:   Replace permissive USING (true) policies with project-bounded access checks
--            using the existing SECURITY DEFINER helper function `aipms_user_has_project_access(project_id)`.

-- ─── 1. Enable Row Level Security (Idempotent) ─────────────────────────────────

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop Permissive Teams Policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on teams" ON "public"."teams";
DROP POLICY IF EXISTS "Enable insert for authenticated users on teams" ON "public"."teams";
DROP POLICY IF EXISTS "Enable update for authenticated users on teams" ON "public"."teams";
DROP POLICY IF EXISTS "Enable delete for authenticated users on teams" ON "public"."teams";

DROP POLICY IF EXISTS "teams_select_project_access" ON "public"."teams";
DROP POLICY IF EXISTS "teams_insert_project_access" ON "public"."teams";
DROP POLICY IF EXISTS "teams_update_project_access" ON "public"."teams";
DROP POLICY IF EXISTS "teams_delete_project_access" ON "public"."teams";

-- ─── 3. Add Hardened Teams Policies ─────────────────────────────────────────────

CREATE POLICY "teams_select_project_access"
  ON "public"."teams"
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "teams_insert_project_access"
  ON "public"."teams"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "teams_update_project_access"
  ON "public"."teams"
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  )
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "teams_delete_project_access"
  ON "public"."teams"
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

-- ─── 4. Drop Permissive Team Members Policies ──────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on team_members" ON "public"."team_members";
DROP POLICY IF EXISTS "Enable insert for authenticated users on team_members" ON "public"."team_members";
DROP POLICY IF EXISTS "Enable update for authenticated users on team_members" ON "public"."team_members";
DROP POLICY IF EXISTS "Enable delete for authenticated users on team_members" ON "public"."team_members";

DROP POLICY IF EXISTS "team_members_select_project_access" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_insert_project_access" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_update_project_access" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_delete_project_access" ON "public"."team_members";

-- ─── 5. Add Hardened Team Members Policies ─────────────────────────────────────

CREATE POLICY "team_members_select_project_access"
  ON "public"."team_members"
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM "public"."teams" t WHERE t.id = team_id)
    )
  );

CREATE POLICY "team_members_insert_project_access"
  ON "public"."team_members"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM "public"."teams" t WHERE t.id = team_id)
    )
  );

CREATE POLICY "team_members_update_project_access"
  ON "public"."team_members"
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM "public"."teams" t WHERE t.id = team_id)
    )
  )
  WITH CHECK (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM "public"."teams" t WHERE t.id = team_id)
    )
  );

CREATE POLICY "team_members_delete_project_access"
  ON "public"."team_members"
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM "public"."teams" t WHERE t.id = team_id)
    )
  );
