-- ============================================================================
-- AIPMS Authorization & RBAC Transformation Migration
-- Additive Schema, Project Members Table, and Strict Row Level Security Policies
-- ============================================================================

-- 1. Create project_members table if not exists
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'PROJECT_MANAGER' CHECK (role IN ('PROJECT_MANAGER', 'MEMBER', 'VIEWER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_members
ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Helper Functions for Resource-scoped Access
CREATE OR REPLACE FUNCTION public.aipms_user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- System Admin has access to all projects
    (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
    OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
      UNION
      SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid()
      UNION
      SELECT 1 FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.project_id = p_project_id AND tm.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.aipms_user_can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- System Admin has full management authority
    (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
    OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
      UNION
      SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid() AND role = 'PROJECT_MANAGER'
    )
  );
$$;

-- 3. Strict Row Level Security Policies for projects
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users matching owner_id" ON projects;
DROP POLICY IF EXISTS "Enable update for users matching owner_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users matching owner_id" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

CREATE POLICY "projects_select_policy"
ON projects FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(id)
);

CREATE POLICY "projects_insert_policy"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
);

CREATE POLICY "projects_update_policy"
ON projects FOR UPDATE
TO authenticated
USING (
  public.aipms_user_can_manage_project(id)
)
WITH CHECK (
  -- Prevent arbitrary ownership alteration via standard UPDATE
  (owner_id = (SELECT p.owner_id FROM projects p WHERE p.id = projects.id))
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
);

CREATE POLICY "projects_delete_policy"
ON projects FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
);

-- 4. Strict Row Level Security Policies for project_members
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;

CREATE POLICY "project_members_select_policy"
ON project_members FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
);

CREATE POLICY "project_members_insert_policy"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Only Project Owner or System Admin can assign members
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
);

CREATE POLICY "project_members_delete_policy"
ON project_members FOR DELETE
TO authenticated
USING (
  -- Only Project Owner or System Admin can remove members
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' OR auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'ADMIN')
);
