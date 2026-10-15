-- Migration: Risks RLS Policies

-- ─── 1. Enable Row Level Security on risks ────────────────────────────────────

ALTER TABLE "public"."risks" ENABLE ROW LEVEL SECURITY;

-- ─── 2. Risks Table RLS Policies ──────────────────────────────────────────────

DROP POLICY IF EXISTS "risks_select_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_insert_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_update_project_access" ON "public"."risks";
DROP POLICY IF EXISTS "risks_delete_project_access" ON "public"."risks";

DROP POLICY IF EXISTS "Enable read access for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable insert for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable update for authenticated users on risks" ON "public"."risks";
DROP POLICY IF EXISTS "Enable delete for authenticated users on risks" ON "public"."risks";

CREATE POLICY "risks_select_project_access"
  ON public.risks
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "risks_insert_project_access"
  ON public.risks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "risks_update_project_access"
  ON public.risks
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  )
  WITH CHECK (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "risks_delete_project_access"
  ON public.risks
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );
