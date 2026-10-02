-- Migration: Add Row Level Security (RLS) policies for teams and team_members

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- ─── Teams RLS Policies ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on teams" ON "public"."teams";
CREATE POLICY "Enable read access for authenticated users on teams"
ON "public"."teams" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users on teams" ON "public"."teams";
CREATE POLICY "Enable insert for authenticated users on teams"
ON "public"."teams" FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users on teams" ON "public"."teams";
CREATE POLICY "Enable update for authenticated users on teams"
ON "public"."teams" FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users on teams" ON "public"."teams";
CREATE POLICY "Enable delete for authenticated users on teams"
ON "public"."teams" FOR DELETE
TO authenticated
USING (true);

-- ─── Team Members RLS Policies ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Enable read access for authenticated users on team_members" ON "public"."team_members";
CREATE POLICY "Enable read access for authenticated users on team_members"
ON "public"."team_members" FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users on team_members" ON "public"."team_members";
CREATE POLICY "Enable insert for authenticated users on team_members"
ON "public"."team_members" FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users on team_members" ON "public"."team_members";
CREATE POLICY "Enable update for authenticated users on team_members"
ON "public"."team_members" FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users on team_members" ON "public"."team_members";
CREATE POLICY "Enable delete for authenticated users on team_members"
ON "public"."team_members" FOR DELETE
TO authenticated
USING (true);
