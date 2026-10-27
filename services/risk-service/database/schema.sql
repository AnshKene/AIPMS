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
