-- AIPMS Sprint Management Service Database Schema

CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,

  goal TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),

  start_date TIMESTAMPTZ NOT NULL,

  end_date TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sprints_project_id
  ON sprints(project_id);

CREATE INDEX IF NOT EXISTS idx_sprints_status
  ON sprints(status);

CREATE INDEX IF NOT EXISTS idx_sprints_start_date
  ON sprints(start_date);

CREATE INDEX IF NOT EXISTS idx_sprints_end_date
  ON sprints(end_date);
