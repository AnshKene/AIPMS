-- ============================================================================
-- AIPMS RBAC Security Remediation Migration
-- Corrective Security Migration: Resolves DEFECT-01, DEFECT-02, DEFECT-03,
-- DEFECT-04, DEFECT-08 and establishes hardened Row Level Security policies.
-- Drops all vulnerable legacy permissive policies (*_authorized) and replaces
-- them with verified, least-privilege, designated-admin enforced policies.
-- ============================================================================

-- 1. Helper function: strict designated system administrator verification (DEFECT-02)
-- Prevents spoofing via JWT claims by enforcing exact conjunction:
-- auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347' AND email = 'admin.ansh@aipms.com'
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

-- 2. Hardened project access function (DEFECT-02)
CREATE OR REPLACE FUNCTION public.aipms_user_has_project_access(p_project_id UUID)
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

-- 3. Hardened project management authority function (DEFECT-02)
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

-- 4. Helper function: securely retrieve current stored project owner (DEFECT-03)
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

-- 4b. Helper function: securely verify team lead authority without RLS recursion
CREATE OR REPLACE FUNCTION public.aipms_is_team_lead(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    p_team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role = 'TEAM_LEAD'
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_is_team_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_is_team_lead(UUID) TO authenticated;

-- 5. Remediate projects policies (DEFECT-02, DEFECT-03, DEFECT-04)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies and intermediate policies
DROP POLICY IF EXISTS "projects_select_authorized" ON projects;
DROP POLICY IF EXISTS "projects_insert_authorized" ON projects;
DROP POLICY IF EXISTS "projects_update_authorized" ON projects;
DROP POLICY IF EXISTS "projects_delete_authorized" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users matching owner_id" ON projects;
DROP POLICY IF EXISTS "Enable update for users matching owner_id" ON projects;
DROP POLICY IF EXISTS "Enable delete for users matching owner_id" ON projects;

CREATE POLICY "projects_select_policy"
ON projects FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(id)
);

-- DEFECT-04: Prevent unauthorized project creation by VIEWER or ordinary TEAM_MEMBER
CREATE POLICY "projects_insert_policy"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  public.aipms_is_designated_admin()
  OR (
    auth.uid() = owner_id
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') IN ('PROJECT_MANAGER', 'PROJECT_OWNER')
  )
);

-- DEFECT-03: Permit legitimate ownership transfer by project owner or designated admin;
-- distinguishes current stored owner from candidate new owner without RLS recursion.
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

-- 6. Remediate project_members policies (DEFECT-02)
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select_authorized" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_authorized" ON project_members;
DROP POLICY IF EXISTS "project_members_update_authorized" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_authorized" ON project_members;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
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

CREATE POLICY "project_members_update_policy"
ON project_members FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid())
  OR public.aipms_is_designated_admin()
)
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

-- 7. Remediate tasks policies (DEFECT-01)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_update_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_authorized" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Enable select for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable insert for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable update for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable delete for project owners and task creators" ON tasks;

CREATE POLICY "tasks_select_policy"
ON tasks FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
  OR assignee_id = auth.uid()
);

-- DEFECT-01: Enforce that team_id belongs to tasks.project_id
CREATE POLICY "tasks_insert_policy"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.aipms_user_can_manage_project(project_id)
    OR public.aipms_is_team_lead(team_id)
  )
  AND (
    team_id IS NULL
    OR EXISTS (
      SELECT 1 FROM teams t WHERE t.id = tasks.team_id AND t.project_id = tasks.project_id
    )
  )
);

CREATE POLICY "tasks_update_policy"
ON tasks FOR UPDATE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
  OR public.aipms_is_team_lead(team_id)
  OR assignee_id = auth.uid()
)
WITH CHECK (
  (
    public.aipms_user_can_manage_project(project_id)
    OR public.aipms_is_team_lead(team_id)
    OR assignee_id = auth.uid()
  )
  AND (
    team_id IS NULL
    OR EXISTS (
      SELECT 1 FROM teams t WHERE t.id = tasks.team_id AND t.project_id = tasks.project_id
    )
  )
);

CREATE POLICY "tasks_delete_policy"
ON tasks FOR DELETE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
);

-- 7b. Trigger for strict column-level task update enforcement
-- Enforces that non-lead assignees can ONLY update task status (and updated_at).
-- Direct SQL updates to title, description, priority, due_date, start_date,
-- project_id, team_id, sprint_id, assignee_id, or creator_id by ordinary assignees are rejected.
CREATE OR REPLACE FUNCTION public.aipms_validate_task_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unauthenticated/superuser/service_role bypass for maintenance and migrations
  IF auth.uid() IS NULL OR (COALESCE(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 1. Project Owner, assigned Project Manager, or Designated Admin has full update authority
  IF public.aipms_user_can_manage_project(OLD.project_id) THEN
    -- If project_id is being changed, ensure user can manage target project as well
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      IF NOT public.aipms_user_can_manage_project(NEW.project_id) THEN
        RAISE EXCEPTION 'Access Denied: Cannot transfer task to unmanaged target project'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- 2. Team Lead of the task's team has task update authority within their team
  IF OLD.team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = OLD.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'TEAM_LEAD'
  ) THEN
    -- Team Lead cannot transfer task across projects
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      RAISE EXCEPTION 'Access Denied: Team Leads cannot transfer tasks across projects'
        USING ERRCODE = '42501';
    END IF;
    -- Team Lead cannot reassign task to a team they do not lead
    IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
      IF NOT (NEW.team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM team_members tm2
        WHERE tm2.team_id = NEW.team_id
          AND tm2.user_id = auth.uid()
          AND tm2.role = 'TEAM_LEAD'
      )) THEN
        RAISE EXCEPTION 'Access Denied: Team Leads can only assign tasks within their own team'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- 3. Ordinary Assignee: strictly restricted to status updates only
  IF OLD.assignee_id = auth.uid() THEN
    IF (NEW.title IS DISTINCT FROM OLD.title
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.priority IS DISTINCT FROM OLD.priority
        OR NEW.due_date IS DISTINCT FROM OLD.due_date
        OR NEW.start_date IS DISTINCT FROM OLD.start_date
        OR NEW.project_id IS DISTINCT FROM OLD.project_id
        OR NEW.team_id IS DISTINCT FROM OLD.team_id
        OR NEW.sprint_id IS DISTINCT FROM OLD.sprint_id
        OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
        OR NEW.creator_id IS DISTINCT FROM OLD.creator_id) THEN
      RAISE EXCEPTION 'Access Denied: Task assignees can only update task status'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Any other user is blocked
  RAISE EXCEPTION 'Access Denied: Unauthorized task update'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aipms_validate_task_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aipms_validate_task_update() TO authenticated;

DROP TRIGGER IF EXISTS trg_aipms_validate_task_update ON tasks;
CREATE TRIGGER trg_aipms_validate_task_update
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.aipms_validate_task_update();

-- 8. Remediate task_dependencies policies (DEFECT-08)
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_dependencies_select_authorized" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_authorized" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_update_authorized" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_authorized" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_select_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_update_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_select_both_tasks_access" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_both_tasks_access" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_both_tasks_access" ON task_dependencies;
DROP POLICY IF EXISTS "Enable select dependencies for users with access to both tasks" ON task_dependencies;
DROP POLICY IF EXISTS "Enable insert dependencies for users with access to both tasks" ON task_dependencies;
DROP POLICY IF EXISTS "Enable delete dependencies for users with access to both tasks" ON task_dependencies;

CREATE POLICY "task_dependencies_select_policy"
ON task_dependencies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE (t.id = task_dependencies.task_id OR t.id = task_dependencies.depends_on_task_id)
      AND public.aipms_user_has_project_access(t.project_id)
  )
);

-- DEFECT-08: Ensure task dependencies cannot be created across projects, and require manage permissions
CREATE POLICY "task_dependencies_insert_policy"
ON task_dependencies FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tasks t1, tasks t2
    WHERE t1.id = task_dependencies.task_id
      AND t2.id = task_dependencies.depends_on_task_id
      AND t1.project_id = t2.project_id
      AND public.aipms_user_can_manage_project(t1.project_id)
  )
);

CREATE POLICY "task_dependencies_update_policy"
ON task_dependencies FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_dependencies.task_id
      AND public.aipms_user_can_manage_project(t.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tasks t1, tasks t2
    WHERE t1.id = task_dependencies.task_id
      AND t2.id = task_dependencies.depends_on_task_id
      AND t1.project_id = t2.project_id
      AND public.aipms_user_can_manage_project(t1.project_id)
  )
);

CREATE POLICY "task_dependencies_delete_policy"
ON task_dependencies FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tasks t1
    WHERE t1.id = task_dependencies.task_id
      AND public.aipms_user_can_manage_project(t1.project_id)
  )
);

-- 9. Remediate teams policies (DEFECT-02, DEFECT-05)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select_authorized" ON teams;
DROP POLICY IF EXISTS "teams_insert_authorized" ON teams;
DROP POLICY IF EXISTS "teams_update_authorized" ON teams;
DROP POLICY IF EXISTS "teams_delete_authorized" ON teams;
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;
DROP POLICY IF EXISTS "Enable read access for authenticated users on teams" ON teams;
DROP POLICY IF EXISTS "Enable insert for authenticated users on teams" ON teams;
DROP POLICY IF EXISTS "Enable update for authenticated users on teams" ON teams;
DROP POLICY IF EXISTS "Enable delete for authenticated users on teams" ON teams;

CREATE POLICY "teams_select_policy"
ON teams FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
);

CREATE POLICY "teams_insert_policy"
ON teams FOR INSERT
TO authenticated
WITH CHECK (
  public.aipms_user_can_manage_project(project_id)
);

CREATE POLICY "teams_update_policy"
ON teams FOR UPDATE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
)
WITH CHECK (
  public.aipms_user_can_manage_project(project_id)
);

CREATE POLICY "teams_delete_policy"
ON teams FOR DELETE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
);

-- 10. Remediate team_members policies (DEFECT-02, DEFECT-05)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_update_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_authorized" ON team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users on team_members" ON team_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users on team_members" ON team_members;
DROP POLICY IF EXISTS "Enable update for authenticated users on team_members" ON team_members;
DROP POLICY IF EXISTS "Enable delete for authenticated users on team_members" ON team_members;

CREATE POLICY "team_members_select_policy"
ON team_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
      AND public.aipms_user_has_project_access(t.project_id)
  )
);

CREATE POLICY "team_members_insert_policy"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
      AND (
        public.aipms_user_can_manage_project(t.project_id)
        OR (
          public.aipms_is_team_lead(team_members.team_id)
          AND role = 'MEMBER'
        )
      )
  )
);

CREATE POLICY "team_members_update_policy"
ON team_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
      AND public.aipms_user_can_manage_project(t.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
      AND public.aipms_user_can_manage_project(t.project_id)
  )
);

CREATE POLICY "team_members_delete_policy"
ON team_members FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
      AND (
        public.aipms_user_can_manage_project(t.project_id)
        OR (
          public.aipms_is_team_lead(team_members.team_id)
          AND team_members.user_id <> auth.uid()
        )
      )
  )
);

-- 11. Remediate sprints policies (DEFECT-02, DEFECT-05)
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sprints_select_authorized" ON sprints;
DROP POLICY IF EXISTS "sprints_insert_authorized" ON sprints;
DROP POLICY IF EXISTS "sprints_update_authorized" ON sprints;
DROP POLICY IF EXISTS "sprints_delete_authorized" ON sprints;
DROP POLICY IF EXISTS "sprints_select_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_insert_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_update_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_delete_policy" ON sprints;
DROP POLICY IF EXISTS "sprints_select_project_access" ON sprints;
DROP POLICY IF EXISTS "sprints_insert_project_access" ON sprints;
DROP POLICY IF EXISTS "sprints_update_project_access" ON sprints;
DROP POLICY IF EXISTS "sprints_delete_project_access" ON sprints;

CREATE POLICY "sprints_select_policy"
ON sprints FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
);

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

CREATE POLICY "sprints_delete_policy"
ON sprints FOR DELETE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
);

-- 12. Remediate risks policies (DEFECT-02, DEFECT-06)
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "risks_select_authorized" ON risks;
DROP POLICY IF EXISTS "risks_insert_authorized" ON risks;
DROP POLICY IF EXISTS "risks_update_authorized" ON risks;
DROP POLICY IF EXISTS "risks_delete_authorized" ON risks;
DROP POLICY IF EXISTS "risks_select_policy" ON risks;
DROP POLICY IF EXISTS "risks_insert_policy" ON risks;
DROP POLICY IF EXISTS "risks_update_policy" ON risks;
DROP POLICY IF EXISTS "risks_delete_policy" ON risks;

CREATE POLICY "risks_select_policy"
ON risks FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
);

CREATE POLICY "risks_insert_policy"
ON risks FOR INSERT
TO authenticated
WITH CHECK (
  public.aipms_is_designated_admin()
  OR (
    public.aipms_user_has_project_access(project_id)
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') <> 'VIEWER'
    AND NOT EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = risks.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'VIEWER'
    )
  )
);

CREATE POLICY "risks_update_policy"
ON risks FOR UPDATE
TO authenticated
USING (
  public.aipms_is_designated_admin()
  OR (
    public.aipms_user_has_project_access(project_id)
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') <> 'VIEWER'
    AND NOT EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = risks.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'VIEWER'
    )
  )
)
WITH CHECK (
  public.aipms_is_designated_admin()
  OR (
    public.aipms_user_has_project_access(project_id)
    AND COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'TEAM_MEMBER') <> 'VIEWER'
    AND NOT EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = risks.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'VIEWER'
    )
  )
);

CREATE POLICY "risks_delete_policy"
ON risks FOR DELETE
TO authenticated
USING (
  public.aipms_user_can_manage_project(project_id)
);

-- 13. Remediate audit_logs policies (DEFECT-02)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_authorized" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;

CREATE POLICY "audit_logs_select_policy"
ON audit_logs FOR SELECT
TO authenticated
USING (
  public.aipms_is_designated_admin()
  OR (auth.jwt() ->> 'role' = 'service_role')
);

-- 13b. Trigger for tamper-proof audit log immutability
-- Rejects direct UPDATE and DELETE statements on audit_logs.
-- Threat Model:
--   - Protects against authenticated end-users attempting tampering.
--   - Protects against microservices using service_role attempting mutation or deletion of audit trail.
--   - Does NOT prevent direct DDL / superuser TRUNCATE or trigger disabling by postgres role.
CREATE OR REPLACE FUNCTION public.aipms_audit_logs_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only and strictly immutable. UPDATE and DELETE operations are prohibited.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_aipms_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_aipms_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.aipms_audit_logs_immutable();

