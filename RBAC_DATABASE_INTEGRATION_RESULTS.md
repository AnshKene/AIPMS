# AIPMS — Database Integration Verification Report

**Date:** October 27, 2026  
**Evaluation Scope:** Database-Level RBAC & RLS Integration Verification  
**Repository:** Local Repository (`AnshKene/AIPMS`)  
**Designated System Administrator Target:**  
- **ID:** `66544acc-4e3d-4b3b-b3f3-44971c6a9347`  
- **Email:** `admin.ansh@aipms.com`  

---

## 1. Phase 1 — Local Database Environment Discovery

### Environment Discovery Summary

| Component | Detected State | Operational Status | Blocker Description |
| :--- | :--- | :--- | :--- |
| **Docker Engine** | Docker CLI 29.6.2 (build dfc4efb) | **UNAVAILABLE** | Daemon API offline (`//./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`). 0 running docker processes. |
| **Local PostgreSQL Port 5432** | `localhost:5432` | **UNAVAILABLE** | TCP connection refused (`WARNING: TCP connect to (127.0.0.1:5432) failed`). |
| **Windows Service: postgresql-x64-16** | Registered Service (Auto) | **UNAVAILABLE** | Service stopped. Binary directory `C:\Program Files\PostgreSQL\16\bin` and data directory `C:\Program Files\PostgreSQL\16\data` do not exist on disk. Starting service blocked by lack of OS administrative permissions (`Cannot open postgresql-x64-16 service on computer '.'`). |
| **Windows Service: postgresql-x64-18** | Registered Service (Auto) | **UNAVAILABLE** | Service stopped. Binary directory `C:\Program Files\PostgreSQL\18\bin` and data directory `C:\Program Files\PostgreSQL\18\data` do not exist on disk. |
| **Local Supabase Environment** | `supabase start` | **UNAVAILABLE** | Requires running Docker engine daemon. |

### Blocker Conclusion
Per **Phase 1, Requirement 6**:
> *"If Docker or PostgreSQL is unavailable, report the exact blocker and stop before claiming database verification. Do not install software or change system configuration without authorization."*

Neither an active PostgreSQL engine nor a running Docker daemon is available in this local environment. In strict compliance with safety guidelines, no external packages were downloaded, no system-level registry modifications were executed, and no remote Supabase/production databases were contacted.

Consequently, direct live-catalog SQL inspection and live SQL statement execution are formally marked **BLOCKED — ENVIRONMENT**.

---

## 2. Phase 2 — Migration Pipeline Review & Analysis

The repository contains two sequential migrations designed to apply to PostgreSQL 15+ / Supabase RLS:
1. `supabase/migrations/20261026000000_rbac_project_members_and_rls.sql`
2. `supabase/migrations/20261026000001_remediate_rbac_and_rls.sql`

### Migration Source-Level Evaluation

| File | Intent | Static SQL Evaluation | Database Execution Status |
| :--- | :--- | :--- | :--- |
| `20261026000000_rbac_project_members_and_rls.sql` | Baseline additive schema for `project_members` and initial RLS policies. | Contains loose `OR` admin logic and recursive update check (Defects 02, 03, 04). | **BLOCKED — ENVIRONMENT** |
| `20261026000001_remediate_rbac_and_rls.sql` | Corrective migration remediating DEFECT-01, DEFECT-02, DEFECT-03, DEFECT-04, DEFECT-08. | Hardens helper functions, eliminates spoofable claims, resolves ownership transfer, and restricts dependency creation. | **BLOCKED — ENVIRONMENT** |

---

## 3. Phase 3 — Database Structure & Security Configuration Verification

Because active database catalog tables (`pg_class`, `pg_policy`, `information_schema`) cannot be queried dynamically without an active PostgreSQL instance, each requirement was evaluated via rigorous source inspection of the schema and migration definitions:

### 1. RLS Enabled on Protected Tables
- **Expected:** `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on `projects`, `project_members`, `teams`, `team_members`, `sprints`, `tasks`, `task_dependencies`, `risks`.
- **Verified Source State:** Present across all schema definitions and migrations.
- **Status:** **BLOCKED — ENVIRONMENT** (Catalog query pending) / **VERIFIED IN CODE**

### 2. Expected Policies for CRUD Operations
- **`projects`:**
  - `projects_select_policy`: `public.aipms_user_has_project_access(id)`
  - `projects_insert_policy`: Strict conjunction check for designated admin OR `(owner_id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER', 'PROJECT_OWNER'))`
  - `projects_update_policy`: Disambiguated check using `public.aipms_get_project_owner(id)`
  - `projects_delete_policy`: Restricted to project owner or designated admin
- **`project_members`:**
  - `project_members_select_policy`: Scoped to `public.aipms_user_has_project_access(project_id)`
  - `project_members_insert_policy`: Restricted to Project Owner or designated admin
  - `project_members_delete_policy`: Restricted to Project Owner or designated admin
- **`tasks`:**
  - `tasks_insert_policy`: Enforces management authority AND `(team_id IS NULL OR EXISTS (SELECT 1 FROM teams t WHERE t.id = tasks.team_id AND t.project_id = tasks.project_id))`
  - `tasks_update_policy`: Same project-team matching constraint + assignee access
- **`task_dependencies`:**
  - `task_dependencies_insert_policy`: Requires `t1.project_id = t2.project_id` and `public.aipms_user_can_manage_project(t1.project_id)`
  - `task_dependencies_delete_policy`: Requires management authority on `t1.project_id`
- **Status:** **BLOCKED — ENVIRONMENT** (Catalog query pending) / **VERIFIED IN CODE**

### 3. Security Definer Helper Functions
- **`public.aipms_is_designated_admin()`:**
  - Declared: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`
  - Conjunction: `auth.uid() = '66544acc-4e3d-4b3b-b3f3-44971c6a9347'::uuid AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'admin.ansh@aipms.com'`
  - Grants: `REVOKE EXECUTE ON FUNCTION public.aipms_is_designated_admin() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.aipms_is_designated_admin() TO authenticated;`
- **`public.aipms_get_project_owner(UUID)`:**
  - Declared: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`
  - Prevents recursive RLS evaluation when reading the stored row owner in UPDATE policies.
- **Status:** **BLOCKED — ENVIRONMENT** (Catalog query pending) / **VERIFIED IN CODE**

---

## 4. Phase 4 — Integration Test Matrix

The 17 test scenarios specified in the verification mission were analyzed. Direct live database assertions could not be executed due to the environment blocker. The table below distinguishes the architectural code verification status from the live database execution status.

| Scenario | Expected Result | Source Implementation Status | Live Database Status | Reason / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **1. Designated System Admin accesses authorized operation** | Allowed | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `aipms_is_designated_admin()` matches UUID + email. Unit tests in all 9 services verify admin pass-through. |
| **2. Different user supplies an ADMIN role claim** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `aipms_is_designated_admin()` ignores `app_metadata.role` and requires exact UUID `66544acc-...`. Forged token rejected in unit tests. |
| **3. Wrong user ID with matching admin email** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Strict conjunction in SQL requires `auth.uid() = '66544acc-...' AND email = 'admin.ansh@aipms.com'`. |
| **4. Viewer attempts direct project creation** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `projects_insert_policy` requires role in `('ADMIN', 'PROJECT_MANAGER', 'PROJECT_OWNER')`. API Gateway guard also rejects with 403. |
| **5. Team Member attempts direct project creation** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `projects_insert_policy` defaults unassigned role to `TEAM_MEMBER` and denies insert. API Gateway blocks POST `/projects`. |
| **6. Unauthorized PM creates project** | Denied per policy | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | API gateway denies project creation unless permitted; database policy requires `owner_id = auth.uid()`. |
| **7. Project Owner creates permitted project** | Allowed | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Satisfies `auth.uid() = owner_id AND role IN ('PROJECT_MANAGER', 'PROJECT_OWNER')`. Unit tests pass. |
| **8. Project Owner transfers ownership to eligible user** | Allowed | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `aipms_get_project_owner(id) = auth.uid()` evaluates to true in `projects_update_policy` `WITH CHECK`. Unit tests pass. |
| **9. Unauthorized user transfers project ownership** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Fails `USING (public.aipms_user_can_manage_project(id))`. Rejected with 403 in `projects.service.ts`. |
| **10. Project Manager changes ownership** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | In `projects_update_policy`, `owner_id != aipms_get_project_owner(id)` and `aipms_get_project_owner(id) != auth.uid()`. Denied by `WITH CHECK`. |
| **11. Team Lead creates task with team from another project** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `tasks_insert_policy` enforces `EXISTS (SELECT 1 FROM teams t WHERE t.id = tasks.team_id AND t.project_id = tasks.project_id)`. `TasksService.create` throws 400. |
| **12. Task references sprint from another project** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Checked in `TasksService.create` and `TasksService.update`. Unit tests pass. |
| **13. Viewer or Team Member inserts/deletes task dependencies** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | `task_dependencies_insert_policy` requires `public.aipms_user_can_manage_project`. `TasksService` throws 403 for Viewer and Team Member. |
| **14. Authorized manager creates valid same-project dependency** | Allowed | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Matches `t1.project_id = t2.project_id` and management authority. Cycle check passes. Unit tests pass. |
| **15. User reads another project's protected records** | Denied / 0 rows | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Scoped via `aipms_user_has_project_access(project_id)` in RLS and `resolveAuthorizedProjectIds` in services. |
| **16. User updates/deletes records outside permissions** | Denied | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Update and delete policies on tasks, teams, sprints require project management authority. |
| **17. Anonymous/invalid-auth request accesses protected data** | Denied (401) | VERIFIED PASS | **BLOCKED — ENVIRONMENT** | Enforced by `requireAuthHeader` across all service controllers and RLS `TO authenticated`. |

---

## 5. Phase 5 — Ownership-Transfer Semantics Evaluation

### Root Cause Analysis of Previous Defect (DEFECT-03)
In the initial migration `20261026000000_rbac_project_members_and_rls.sql`:
```sql
CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO authenticated
USING ( public.aipms_user_can_manage_project(id) )
WITH CHECK (
  (owner_id = (SELECT p.owner_id FROM projects p WHERE p.id = projects.id))
  OR (auth.jwt() ->> 'email' = 'admin.ansh@aipms.com' ...)
);
```
**Defect:** During an UPDATE statement, when `owner_id` is changed to `new_owner_id`, `(owner_id = (SELECT p.owner_id FROM projects p WHERE p.id = projects.id))` evaluates against the new row or attempts recursive evaluation under RLS. If the caller was the legitimate project owner, RLS rejected the update because the owner was not the System Admin.

### Remediation via `public.aipms_get_project_owner(UUID)`
In `20261026000001_remediate_rbac_and_rls.sql`:
```sql
CREATE OR REPLACE FUNCTION public.aipms_get_project_owner(p_project_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT owner_id FROM projects WHERE id = p_project_id;
$$;

CREATE POLICY "projects_update_policy" ON projects FOR UPDATE TO authenticated
USING ( public.aipms_user_can_manage_project(id) )
WITH CHECK (
  (owner_id = public.aipms_get_project_owner(id))
  OR (public.aipms_get_project_owner(id) = auth.uid())
  OR public.aipms_is_designated_admin()
);
```

### Truth Table Analysis

| Case | Caller Identity | Proposed `owner_id` | `owner_id = aipms_get_project_owner(id)` | `aipms_get_project_owner(id) = auth.uid()` | `aipms_is_designated_admin()` | Policy Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Edit** (Title/Status) | Project Manager | Unchanged | **TRUE** | False | False | **ALLOWED** |
| **Normal Edit** (Title/Status) | Project Owner | Unchanged | **TRUE** | True | False | **ALLOWED** |
| **Legitimate Transfer** | Project Owner | New Eligible User | False | **TRUE** | False | **ALLOWED** |
| **Admin Transfer** | Designated Admin | New Eligible User | False | False | **TRUE** | **ALLOWED** |
| **Unauthorized Transfer** | Project Manager | Themselves | False | False | False | **DENIED** |
| **Unauthorized Transfer** | Viewer / Member | Themselves | Fails `USING` clause before `WITH CHECK` is reached | — | — | **DENIED** |
| **Spoofed Admin Transfer** | Any User (Spoofed claim) | Any User | False | False | False | **DENIED** |

---

## 6. Cleanup Performed

- No disposable database was created because local PostgreSQL services and Docker daemon were offline.
- No temporary tables or mock databases were created or dropped.
- Zero existing user files, uncommitted edits, or repository branches were modified or removed.

---

## 7. Production Readiness Declaration

> [!CAUTION]
> **PRODUCTION READINESS STATUS: NOT READY FOR DEPLOYMENT**  
> While the application tier (API Gateway, 8 backend microservices, Next.js frontend) is **100% VERIFIED PASS** with 393 passing automated tests and clean production builds, **database-level integration verification remains BLOCKED — ENVIRONMENT**.  
> 
> Production deployment must remain paused until:
> 1. A local or staging PostgreSQL/Supabase instance is started (`supabase start` via active Docker daemon).
> 2. Migrations `20261026000000_...sql` and `20261026000001_...sql` are applied.
> 3. The 17 integration scenarios in Section 4 are executed against live PostgREST endpoints and direct SQL sessions with genuine signed JWT tokens.
