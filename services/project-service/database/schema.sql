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

-- Indexes for common filter operations
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users matching owner_id"
ON projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Enable update for users matching owner_id"
ON projects FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Enable delete for users matching owner_id"
ON projects FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

