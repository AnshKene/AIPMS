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
  creator_id UUID NOT NULL DEFAULT auth.uid(),

  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column addition for existing databases
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS creator_id UUID NOT NULL DEFAULT auth.uid();

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
CREATE POLICY "Enable select for project owners and authorized team members"
ON tasks FOR SELECT
TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
  OR (team_id IS NULL AND project_id IN (SELECT project_id FROM teams WHERE id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))
);

DROP POLICY IF EXISTS "Enable insert for project owners and authorized team members" ON tasks;
CREATE POLICY "Enable insert for project owners and authorized team members"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND (team_id IS NULL OR team_id IN (SELECT id FROM teams WHERE project_id = tasks.project_id))
  AND (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    OR (team_id IS NULL AND project_id IN (SELECT project_id FROM teams WHERE id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))
  )
);

DROP POLICY IF EXISTS "Enable update for project owners and authorized team members" ON tasks;
CREATE POLICY "Enable update for project owners and authorized team members"
ON tasks FOR UPDATE
TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
  OR (team_id IS NULL AND project_id IN (SELECT project_id FROM teams WHERE id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))
)
WITH CHECK (
  (team_id IS NULL OR team_id IN (SELECT id FROM teams WHERE project_id = tasks.project_id))
  AND (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
    OR (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
    OR (team_id IS NULL AND project_id IN (SELECT project_id FROM teams WHERE id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))
  )
);

DROP POLICY IF EXISTS "Enable delete for project owners and task creators" ON tasks;
CREATE POLICY "Enable delete for project owners and task creators"
ON tasks FOR DELETE
TO authenticated
USING (
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  OR (
    creator_id = auth.uid()
    AND (
      (team_id IS NOT NULL AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
      OR (team_id IS NULL AND project_id IN (SELECT project_id FROM teams WHERE id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())))
    )
  )
);

-- Task Dependencies RLS Policies
DROP POLICY IF EXISTS "Enable select dependencies for users with access to both tasks" ON task_dependencies;
CREATE POLICY "Enable select dependencies for users with access to both tasks"
ON task_dependencies FOR SELECT
TO authenticated
USING (
  task_id IN (SELECT id FROM tasks)
  AND depends_on_task_id IN (SELECT id FROM tasks)
);

DROP POLICY IF EXISTS "Enable insert dependencies for users with access to both tasks" ON task_dependencies;
CREATE POLICY "Enable insert dependencies for users with access to both tasks"
ON task_dependencies FOR INSERT
TO authenticated
WITH CHECK (
  task_id IN (SELECT id FROM tasks)
  AND depends_on_task_id IN (SELECT id FROM tasks)
);

DROP POLICY IF EXISTS "Enable delete dependencies for users with access to both tasks" ON task_dependencies;
CREATE POLICY "Enable delete dependencies for users with access to both tasks"
ON task_dependencies FOR DELETE
TO authenticated
USING (
  task_id IN (SELECT id FROM tasks)
  AND depends_on_task_id IN (SELECT id FROM tasks)
);
