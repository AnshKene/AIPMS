-- AIPMS Risk Management Service Database Schema

CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  probability VARCHAR(50) NOT NULL
    CHECK (probability IN ('LOW', 'MEDIUM', 'HIGH')),

  impact VARCHAR(50) NOT NULL
    CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH')),

  risk_score INTEGER NOT NULL
    CHECK (risk_score BETWEEN 1 AND 9),

  status VARCHAR(50) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED', 'CLOSED')),

  mitigation_plan TEXT,
  owner_id UUID,

  due_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_project_id
  ON risks(project_id);

CREATE INDEX IF NOT EXISTS idx_risks_status
  ON risks(status);

CREATE INDEX IF NOT EXISTS idx_risks_probability
  ON risks(probability);

CREATE INDEX IF NOT EXISTS idx_risks_impact
  ON risks(impact);

CREATE INDEX IF NOT EXISTS idx_risks_due_date
  ON risks(due_date);

-- Enable Row Level Security
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

-- Risks Table RLS Policies
DROP POLICY IF EXISTS "risks_select_policy" ON risks;
DROP POLICY IF EXISTS "risks_insert_policy" ON risks;
DROP POLICY IF EXISTS "risks_update_policy" ON risks;
DROP POLICY IF EXISTS "risks_delete_policy" ON risks;

CREATE POLICY "risks_select_policy"
  ON risks
  FOR SELECT
  TO authenticated
  USING (
    public.aipms_user_has_project_access(project_id)
  );

CREATE POLICY "risks_insert_policy"
  ON risks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.aipms_user_can_manage_project(project_id)
  );

CREATE POLICY "risks_update_policy"
  ON risks
  FOR UPDATE
  TO authenticated
  USING (
    public.aipms_user_can_manage_project(project_id)
  )
  WITH CHECK (
    public.aipms_user_can_manage_project(project_id)
  );

CREATE POLICY "risks_delete_policy"
  ON risks
  FOR DELETE
  TO authenticated
  USING (
    public.aipms_user_can_manage_project(project_id)
  );
