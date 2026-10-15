-- AIPMS Team Service Database Schema

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('TEAM_LEAD', 'MEMBER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_project_id ON teams(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ─── Teams RLS Policies ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on teams" ON teams;
CREATE POLICY "Enable read access for authenticated users on teams"
ON teams FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users on teams" ON teams;
CREATE POLICY "Enable insert for authenticated users on teams"
ON teams FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users on teams" ON teams;
CREATE POLICY "Enable update for authenticated users on teams"
ON teams FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users on teams" ON teams;
CREATE POLICY "Enable delete for authenticated users on teams"
ON teams FOR DELETE
TO authenticated
USING (true);

-- ─── Team Members RLS Policies ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on team_members" ON team_members;
CREATE POLICY "Enable read access for authenticated users on team_members"
ON team_members FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users on team_members" ON team_members;
CREATE POLICY "Enable insert for authenticated users on team_members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users on team_members" ON team_members;
CREATE POLICY "Enable update for authenticated users on team_members"
ON team_members FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users on team_members" ON team_members;
CREATE POLICY "Enable delete for authenticated users on team_members"
ON team_members FOR DELETE
TO authenticated
USING (true);
