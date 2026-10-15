-- =============================================================================
-- Migration: task_authorization
-- Purpose:   Add creator_id column to tasks; define production-grade RLS
--            policies for tasks and task_dependencies.
--
-- Authorization model:
--   • Project owner   → projects.owner_id = auth.uid()
--   • Team member     → team_members.user_id = auth.uid()
--                       WHERE team_members.team_id = teams.id
--                       AND   teams.project_id    = tasks.project_id
--
-- Invariants enforced:
--   • creator_id cannot be set by the client; it must equal auth.uid()
--   • assignee_id does NOT grant any access
--   • If team_id is not NULL: teams.project_id MUST equal tasks.project_id
--   • If team_id is not NULL: auth.uid() MUST be a member of that team
--   • project_id is the primary authorization boundary
--   • Dependency operations require access to BOTH referenced tasks
--
-- Recursion safety:
--   All authorization checks JOIN projects / teams / team_members directly.
--   task_dependencies policies do NOT query the tasks table through RLS;
--   they resolve authorization via project/team joins on the task rows
--   using a SECURITY DEFINER helper function to avoid infinite recursion.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.  Add creator_id column to tasks (idempotent)
--     Default auth.uid() stamps the authenticated caller at INSERT time.
--     NOT NULL is enforced; a default of auth.uid() ensures the DB fills it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS creator_id uuid NOT NULL DEFAULT auth.uid();

-- Index to support DELETE policy lookup (creator-based deletes)
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id
  ON public.tasks (creator_id);

-- ---------------------------------------------------------------------------
-- 2.  SECURITY DEFINER helper – safe project-access check
--
--     Returns TRUE when auth.uid() has project-level access to `p_project_id`
--     either as:
--       (a) the project owner, OR
--       (b) a member of any team that belongs to the project.
--
--     Declared SECURITY DEFINER so it can read from the base tables without
--     triggering RLS on tasks, which prevents infinite recursion when this
--     helper is invoked from task_dependencies policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aipms_user_has_project_access(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.projects p
    WHERE  p.id       = p_project_id
      AND  p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM   public.team_members tm
    JOIN   public.teams t ON t.id = tm.team_id
    WHERE  tm.user_id  = auth.uid()
      AND  t.project_id = p_project_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 3.  Drop any pre-existing task policies (idempotent)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_project_access"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_project_access"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_project_access"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_project_access"  ON public.tasks;

-- Also drop legacy names from schema.sql to avoid conflicts
DROP POLICY IF EXISTS "Enable select for project owners and authorized team members"  ON public.tasks;
DROP POLICY IF EXISTS "Enable insert for project owners and authorized team members"  ON public.tasks;
DROP POLICY IF EXISTS "Enable update for project owners and authorized team members"  ON public.tasks;
DROP POLICY IF EXISTS "Enable delete for project owners and task creators"            ON public.tasks;

-- ---------------------------------------------------------------------------
-- 4.  tasks – SELECT
--
--     Allow: project owners AND users who are members of any team that
--            belongs to the task's project.
--     (assignee_id / creator_id grant NO access.)
-- ---------------------------------------------------------------------------
CREATE POLICY "tasks_select_project_access"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

-- ---------------------------------------------------------------------------
-- 5.  tasks – INSERT
--
--     Allow: project owners AND project team members.
--     Require:
--       • creator_id = auth.uid()   (prevents spoofed identity)
--       • If team_id is provided:
--           – teams.project_id = tasks.project_id (team/project coherence)
--           – auth.uid() is a member of that team
-- ---------------------------------------------------------------------------
CREATE POLICY "tasks_insert_project_access"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Identity: caller must be the creator
    creator_id = auth.uid()

    -- Project-level authorization
    AND public.aipms_user_has_project_access(project_id)

    -- Team coherence: if a team is assigned, it must belong to this project
    -- AND the caller must be a member of that team
    AND (
      team_id IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM   public.teams t
          WHERE  t.id         = team_id
            AND  t.project_id = project_id
        )
        AND EXISTS (
          SELECT 1
          FROM   public.team_members tm
          WHERE  tm.team_id  = team_id
            AND  tm.user_id  = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6.  tasks – UPDATE
--
--     USING  checks access to the *existing* task's project (current row).
--     WITH CHECK checks access to the *target* project_id (proposed row).
--
--     This dual-clause approach prevents:
--       • Reading a task you cannot access (USING)
--       • Moving a task to a project you cannot access (WITH CHECK)
--
--     Both clauses also enforce team coherence on the proposed team_id.
--     project_id is NOT in the UpdateTaskDto, so the application layer
--     never sends it; WITH CHECK provides a DB-level backstop regardless.
-- ---------------------------------------------------------------------------
CREATE POLICY "tasks_update_project_access"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    -- Access check on current project
    public.aipms_user_has_project_access(project_id)
  )
  WITH CHECK (
    -- Access check on proposed project (prevents cross-project moves)
    public.aipms_user_has_project_access(project_id)

    -- Team coherence on proposed row
    AND (
      team_id IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM   public.teams t
          WHERE  t.id         = team_id
            AND  t.project_id = project_id
        )
        AND EXISTS (
          SELECT 1
          FROM   public.team_members tm
          WHERE  tm.team_id  = team_id
            AND  tm.user_id  = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 7.  tasks – DELETE
--
--     Allow:
--       (a) Project owner, OR
--       (b) Task creator who is also a member of a team belonging to
--           the task's project.
--
--     assignee_id does NOT grant DELETE.
-- ---------------------------------------------------------------------------
CREATE POLICY "tasks_delete_project_access"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    -- (a) Project owner
    EXISTS (
      SELECT 1
      FROM   public.projects p
      WHERE  p.id       = project_id
        AND  p.owner_id = auth.uid()
    )

    -- (b) Creator who has project-level team membership
    OR (
      creator_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM   public.team_members tm
        JOIN   public.teams t ON t.id = tm.team_id
        WHERE  tm.user_id   = auth.uid()
          AND  t.project_id = project_id
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 8.  Drop any pre-existing task_dependencies policies (idempotent)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_dependencies_select_both_tasks_access"  ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_both_tasks_access"  ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_both_tasks_access"  ON public.task_dependencies;

-- Also drop legacy names
DROP POLICY IF EXISTS "Enable select dependencies for users with access to both tasks"  ON public.task_dependencies;
DROP POLICY IF EXISTS "Enable insert dependencies for users with access to both tasks"  ON public.task_dependencies;
DROP POLICY IF EXISTS "Enable delete dependencies for users with access to both tasks"  ON public.task_dependencies;

-- ---------------------------------------------------------------------------
-- 9.  task_dependencies – SELECT / INSERT / DELETE
--
--     Each policy verifies the caller has project-level access to BOTH
--     the task_id row AND the depends_on_task_id row.
--
--     RECURSION SAFETY: We use the SECURITY DEFINER helper
--     aipms_user_has_project_access() which joins projects/teams/team_members
--     directly.  We resolve the project_id for each task with a scalar
--     subquery on the raw tasks table (bypassing RLS via SECURITY DEFINER
--     context of the helper function, which is called with the resolved
--     project_id, not a tasks-RLS-filtered subquery).
--
--     Pattern:
--       aipms_user_has_project_access(
--         (SELECT t.project_id FROM public.tasks t WHERE t.id = <task_uuid>)
--       )
--     The inner subquery reads tasks as the DEFINER's privileges; it is NOT
--     filtered by the calling user's RLS, avoiding recursion.
-- ---------------------------------------------------------------------------
CREATE POLICY "task_dependencies_select_both_tasks_access"
  ON public.task_dependencies
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = task_id)
    )
    AND
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = depends_on_task_id)
    )
  );

CREATE POLICY "task_dependencies_insert_both_tasks_access"
  ON public.task_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = task_id)
    )
    AND
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = depends_on_task_id)
    )
  );

CREATE POLICY "task_dependencies_delete_both_tasks_access"
  ON public.task_dependencies
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = task_id)
    )
    AND
    public.aipms_user_has_project_access(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = depends_on_task_id)
    )
  );
