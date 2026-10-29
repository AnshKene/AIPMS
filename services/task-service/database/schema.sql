-- AIPMS Task Service Database Schema

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'TODO'
    CHECK (status IN (
      'TODO',
      'IN_PROGRESS',
      'IN_REVIEW',
      'DONE',
      'BLOCKED'
    )),

  priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN (
      'LOW',
      'MEDIUM',
      'HIGH',
      'URGENT'
    )),

  assignee_id UUID,
  team_id UUID,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL DEFAULT auth.uid(),

  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column addition for existing databases
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS creator_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(task_id, depends_on_task_id),

  CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_id
  ON tasks(creator_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id
  ON tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_team_id
  ON tasks(team_id);

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id
  ON tasks(sprint_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON tasks(priority);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id
  ON task_dependencies(task_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on
  ON task_dependencies(depends_on_task_id);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Tasks RLS Policies
DROP POLICY IF EXISTS "Enable select for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable insert for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable update for project owners and authorized team members" ON tasks;
DROP POLICY IF EXISTS "Enable delete for project owners and task creators" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

CREATE POLICY "tasks_select_policy"
ON tasks FOR SELECT
TO authenticated
USING (
  public.aipms_user_has_project_access(project_id)
  OR assignee_id = auth.uid()
);

CREATE POLICY "tasks_insert_policy"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.aipms_user_can_manage_project(project_id)
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = tasks.team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'TEAM_LEAD'
      )
    )
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
  OR (
    team_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'TEAM_LEAD'
    )
  )
  OR assignee_id = auth.uid()
)
WITH CHECK (
  (
    public.aipms_user_can_manage_project(project_id)
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = tasks.team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'TEAM_LEAD'
      )
    )
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

-- Task Dependencies RLS Policies
DROP POLICY IF EXISTS "Enable select dependencies for users with access to both tasks" ON task_dependencies;
DROP POLICY IF EXISTS "Enable insert dependencies for users with access to both tasks" ON task_dependencies;
DROP POLICY IF EXISTS "Enable delete dependencies for users with access to both tasks" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_select_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_insert_policy" ON task_dependencies;
DROP POLICY IF EXISTS "task_dependencies_delete_policy" ON task_dependencies;

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
