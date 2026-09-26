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

  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
