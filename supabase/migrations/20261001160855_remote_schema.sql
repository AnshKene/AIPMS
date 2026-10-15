SET local check_function_bodies = off;

CREATE TABLE "public"."projects" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"            character varying(255)   NOT NULL,
  "description"     text,
  "status"          character varying(50)    NOT NULL DEFAULT 'PLANNING'::character varying,
  "start_date"      timestamp with time zone,
  "end_date"        timestamp with time zone,
  "owner_id"        uuid                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "previous_status" character varying(50),
  CONSTRAINT "projects_pkey" PRIMARY KEY (id),
  CONSTRAINT "projects_previous_status_check"
    CHECK
    (((previous_status)::text = ANY ((ARRAY['PLANNING'::character varying, 'ACTIVE'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying])::text[]))),
  CONSTRAINT "projects_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['PLANNING'::character varying, 'ACTIVE'::character varying, 'ON_HOLD'::character varying, 'COMPLETED'::character varying, 'ARCHIVED'::character
    varying])::text[])))
);

ALTER TABLE "public"."projects"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."risks" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"      uuid                     NOT NULL,
  "title"           character varying(255)   NOT NULL,
  "description"     text,
  "probability"     character varying(50)    NOT NULL,
  "impact"          character varying(50)    NOT NULL,
  "risk_score"      integer                  NOT NULL,
  "status"          character varying(50)    NOT NULL DEFAULT 'OPEN'::character varying,
  "mitigation_plan" text,
  "owner_id"        uuid,
  "due_date"        timestamp with time zone,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "risks_impact_check" CHECK (((impact)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[]))),
  CONSTRAINT "risks_pkey" PRIMARY KEY (id),
  CONSTRAINT "risks_probability_check" CHECK (((probability)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[]))),
  CONSTRAINT "risks_risk_score_check" CHECK (((risk_score >= 1) AND (risk_score <= 9))),
  CONSTRAINT "risks_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'MITIGATING'::character varying, 'RESOLVED'::character varying, 'ACCEPTED'::character varying, 'CLOSED'::character
    varying])::text[])))
);

ALTER TABLE "public"."risks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sprints" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid                     NOT NULL,
  "name"       character varying(255)   NOT NULL,
  "goal"       text,
  "status"     character varying(50)    NOT NULL DEFAULT 'PLANNED'::character varying,
  "start_date" timestamp with time zone NOT NULL,
  "end_date"   timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sprints_check" CHECK ((end_date >= start_date)),
  CONSTRAINT "sprints_pkey" PRIMARY KEY (id),
  CONSTRAINT "sprints_status_check"
    CHECK (((status)::text = ANY ((ARRAY['PLANNED'::character varying, 'ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);

ALTER TABLE "public"."sprints"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_dependencies" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"            uuid                     NOT NULL,
  "depends_on_task_id" uuid                     NOT NULL,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_dependencies_check" CHECK ((task_id <> depends_on_task_id)),
  CONSTRAINT "task_dependencies_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_dependencies_task_id_depends_on_task_id_key" UNIQUE (task_id, depends_on_task_id)
);

ALTER TABLE "public"."task_dependencies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tasks" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"  uuid                     NOT NULL,
  "title"       character varying(255)   NOT NULL,
  "description" text,
  "status"      character varying(50)    NOT NULL DEFAULT 'TODO'::character varying,
  "priority"    character varying(50)    NOT NULL DEFAULT 'MEDIUM'::character varying,
  "assignee_id" uuid,
  "team_id"     uuid,
  "start_date"  timestamp with time zone,
  "due_date"    timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check"
    CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
  CONSTRAINT "tasks_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['TODO'::character varying, 'IN_PROGRESS'::character varying, 'IN_REVIEW'::character varying, 'DONE'::character varying, 'BLOCKED'::character
    varying])::text[])))
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."team_members" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "team_id"    uuid                     NOT NULL,
  "user_id"    uuid                     NOT NULL,
  "role"       character varying(50)    NOT NULL DEFAULT 'MEMBER'::character varying,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "team_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_members_role_check" CHECK (((role)::text = ANY ((ARRAY['TEAM_LEAD'::character varying, 'MEMBER'::character varying])::text[]))),
  CONSTRAINT "team_members_team_id_user_id_key" UNIQUE (team_id, user_id)
);

ALTER TABLE "public"."team_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."teams" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "project_id"  uuid                     NOT NULL,
  "name"        character varying(255)   NOT NULL,
  "description" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "teams_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."teams"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

ALTER TABLE "public"."task_dependencies"
  ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE "public"."task_dependencies"
  ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE "public"."team_members"
  ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX idx_projects_owner_id ON public.projects USING btree (owner_id);

CREATE INDEX idx_projects_status ON public.projects USING btree (status);

CREATE INDEX idx_risks_due_date ON public.risks USING btree (due_date);

CREATE INDEX idx_risks_impact ON public.risks USING btree (impact);

CREATE INDEX idx_risks_probability ON public.risks USING btree (probability);

CREATE INDEX idx_risks_project_id ON public.risks USING btree (project_id);

CREATE INDEX idx_risks_status ON public.risks USING btree (status);

CREATE INDEX idx_sprints_end_date ON public.sprints USING btree (end_date);

CREATE INDEX idx_sprints_project_id ON public.sprints USING btree (project_id);

CREATE INDEX idx_sprints_start_date ON public.sprints USING btree (start_date);

CREATE INDEX idx_sprints_status ON public.sprints USING btree (status);

CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies USING btree (depends_on_task_id);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies USING btree (task_id);

CREATE INDEX idx_tasks_assignee_id ON public.tasks USING btree (assignee_id);

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE INDEX idx_tasks_team_id ON public.tasks USING btree (team_id);

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);

CREATE INDEX idx_teams_project_id ON public.teams USING btree (project_id);

CREATE POLICY "projects_delete_owner" ON "public"."projects"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = owner_id));

CREATE POLICY "projects_insert_owner" ON "public"."projects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "projects_select_authenticated" ON "public"."projects"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "projects_update_owner" ON "public"."projects"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = owner_id))
  WITH CHECK ((auth.uid() = owner_id));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."projects" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."risks" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."risks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."risks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."risks" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sprints" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."sprints" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sprints" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sprints" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_dependencies" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."task_dependencies" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_dependencies" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_dependencies" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tasks" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_members" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."team_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_members" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."teams" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "service_role";

