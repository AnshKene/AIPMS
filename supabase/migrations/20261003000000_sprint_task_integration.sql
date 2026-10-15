-- Migration: Sprint-Task Integration & Sprints RLS Policies

-- ─── 1. Add sprint_id foreign key to tasks ────────────────────────────────────

ALTER TABLE "public"."tasks"
  ADD COLUMN IF NOT EXISTS "sprint_id" UUID
  REFERENCES "public"."sprints"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_tasks_sprint_id"
  ON "public"."tasks"("sprint_id");

-- ─── 2. Enable Row Level Security on sprints ──────────────────────────────────

ALTER TABLE "public"."sprints" ENABLE ROW LEVEL SECURITY;

-- ─── 3. Sprints Table RLS Policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "sprints_select_project_access" ON "public"."sprints";
DROP POLICY IF EXISTS "sprints_insert_project_access" ON "public"."sprints";
DROP POLICY IF EXISTS "sprints_update_project_access" ON "public"."sprints";
DROP POLICY IF EXISTS "sprints_delete_project_access" ON "public"."sprints";

DROP POLICY IF EXISTS "Enable read access for authenticated users on sprints" ON "public"."sprints";
DROP POLICY IF EXISTS "Enable insert for authenticated users on sprints" ON "public"."sprints";
DROP POLICY IF EXISTS "Enable update for authenticated users on sprints" ON "public"."sprints";
DROP POLICY IF EXISTS "Enable delete for authenticated users on sprints" ON "public"."sprints";

CREATE POLICY "sprints_select_project_access"
  ON public.sprints
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "sprints_insert_project_access"
  ON public.sprints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "sprints_update_project_access"
  ON public.sprints
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  )
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "sprints_delete_project_access"
  ON public.sprints
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );