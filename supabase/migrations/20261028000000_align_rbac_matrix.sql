-- ============================================================================
-- Migration: 20261028000000_align_rbac_matrix.sql
-- Description: Align Row-Level Security (RLS) with approved AIPMS Permission Matrix
-- Scope:
--   1. Helper function aipms_get_user_role() to read exclusively from trusted
--      app_metadata claim (set by service_role / backend auth). Removes all
--      reliance on user-editable user_metadata.
--   2. Update projects_insert_policy:
--      - Fail-closed: missing, invalid, or unauthorized roles are denied.
--      - System Admin: platform-wide project creation.
--      - Project Owner: can create project where auth.uid() = owner_id AND role = 'PROJECT_OWNER'.
--      - Project Manager, Team Lead, Team Member, Viewer: CANNOT create projects.
--   3. Update aipms_user_can_manage_project():
--      - System Admin: platform-wide administration.
--      - Project Owner: manage owned projects (owner_id = auth.uid()).
--      - Project Manager: manage assigned projects (project_members.role = 'PROJECT_MANAGER').
--      - Team Lead, Team Member, Viewer: CANNOT manage projects.
--   4. Update sprints_insert_policy and sprints_update_policy:
--      - Strict check via aipms_user_can_manage_project() preventing cross-project
--        sprint mutation by unauthorized Project Owners or Project Managers.
-- ============================================================================

-- 1. Helper function: retrieve authenticated user role from trusted JWT claims only
CREATE OR REPLACE FUNCTION public.aipms_get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Strictly read from server-controlled app_metadata.
  -- user_metadata is user-editable and NEVER trusted for authorization.
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    'NONE'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_get_user_role() TO authenticated;

-- 2. Hardened project management authority function
-- Enforces that Project Owners can only manage projects they own (owner_id = auth.uid()),
-- and Project Managers can only manage projects where they have an explicit assignment in project_members.
CREATE OR REPLACE FUNCTION public.aipms_user_can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Strict Designated System Admin check
    public.aipms_is_designated_admin()
    OR
    EXISTS (
      -- Project Owner of this specific project
      SELECT 1 FROM projects
      WHERE id = p_project_id
        AND owner_id = auth.uid()
      UNION
      -- Assigned Project Manager for this specific project
      SELECT 1 FROM project_members
      WHERE project_id = p_project_id
        AND user_id = auth.uid()
        AND role = 'PROJECT_MANAGER'
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_user_can_manage_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_user_can_manage_project(UUID) TO authenticated;

-- 3. Remediate projects_insert_policy (FAIL-CLOSED)
-- Only System Admin and verified Project Owners can create projects.
-- Project Managers cannot create projects by default.
-- Team Leads, Team Members, Viewers, and unadorned tokens cannot create projects.
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;

CREATE POLICY "projects_insert_policy"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  public.aipms_is_designated_admin()
  OR (
    auth.uid() = owner_id
    AND public.aipms_get_user_role() = 'PROJECT_OWNER'
  )
);

-- 4. Remediate sprints policies to eliminate coercion errors and enforce strict project scoping
DROP POLICY IF EXISTS "sprints_insert_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_update_policy" ON sprints;

CREATE POLICY "sprints_insert_policy"
ON sprints FOR INSERT
TO authenticated
WITH CHECK (
  public.aipms_user_can_manage_project(project_id)
);

CREATE POLICY "sprints_update_policy"
ON sprints FOR UPDATE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
)
WITH CHECK (
  public.aipms_user_can_manage_project(project_id)
);
