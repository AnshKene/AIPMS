-- AIPMS Project Service Database Schema

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  owner_id UUID NOT NULL,
  previous_status VARCHAR(50) CHECK (previous_status IS NULL OR previous_status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50)
CHECK (
  previous_status IS NULL OR
  previous_status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED')
);

-- Project Members Table (Explicit Project-Scoped Assignment)
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

-- Indexes for common filter operations
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Security Definer Helper Functions
CREATE OR REPLACE FUNCTION public.aipms_is_designated_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347'::uuid
    AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'admin.ansh@aipms.com'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_is_designated_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_is_designated_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.aipms_user_has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.aipms_is_designated_admin()
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

REVOKE EXECUTE ON FUNCTION public.aipms_user_has_project_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_user_has_project_access(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.aipms_user_can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.aipms_is_designated_admin()
    OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
      UNION
      SELECT 1 FROM project_members
      WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND (
          role = 'PROJECT_MANAGER'
          OR (
            role != 'VIEWER'
            AND (
              COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('PROJECT_MANAGER', 'PROJECT_OWNER', 'ADMIN')
              OR COALESCE(auth.jwt() ->> 'role', '') IN ('PROJECT_MANAGER', 'PROJECT_OWNER', 'ADMIN')
            )
          )
        )
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_user_can_manage_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_user_can_manage_project(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.aipms_get_project_owner(p_project_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id FROM projects WHERE id = p_project_id;
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_get_project_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_get_project_owner(UUID) TO authenticated;

-- RLS Policies for projects
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
  public.aipms_is_designated_admin()
  OR (
    auth.uid() = owner_id
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') IN ('ADMIN', 'PROJECT_MANAGER', 'PROJECT_OWNER')
  )
);

CREATE POLICY "projects_update_policy"
ON projects FOR UPDATE
TO authenticated
USING (
  public.aipms_user_can_manage_project(id)
)
WITH CHECK (
  (owner_id = public.aipms_get_project_owner(id))
  OR (public.aipms_get_project_owner(id) = auth.uid())
  OR public.aipms_is_designated_admin()
);

CREATE POLICY "projects_delete_policy"
ON projects FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.aipms_is_designated_admin()
);

-- RLS Policies for project_members
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
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  OR public.aipms_is_designated_admin()
);

CREATE POLICY "project_members_delete_policy"
ON project_members FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  OR public.aipms_is_designated_admin()
);
