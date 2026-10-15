/**
 * AIPMS Project Intelligence Test Fixture Generator
 *
 * Deterministic multi-scenario generator for validating:
 * - Scenario A: Healthy Project (Stable velocity, low risks, clean DAG)
 * - Scenario B: At-Risk Project (Moderate overdue, velocity deficit, mid-risk)
 * - Scenario C: Critical Project (Severe overdue, multiple critical risks, blocked tasks)
 * - Scenario D: Dependency Bottlenecks (Deep sequential chain + fan-out)
 * - Scenario E: Workload Imbalance (Overloaded assignee vs light assignees)
 * - Scenario F: Sprint Instability (Approaching sprint deadline with heavy backlog)
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const TEST_MARKER = 'AIPMS_AI_E2E_TEST';

export interface SeededFixtureData {
  testMarker: string;
  testUserId?: string;
  testProjectId: string;
  testProjectName: string;
  testSprintId?: string;
  testTaskIds: string[];
  testDependencyIds: string[];
  testRiskIds: string[];
  testTeamId?: string;
  testTeamMemberIds?: string[];
}

/**
 * Standard Multi-Tier Delivery Project Fixture (Base Fixture)
 */
export async function seedAiFixture(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const timestamp = now.toISOString().slice(11, 19);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: `${TEST_MARKER}: Demo Delivery Platform (${timestamp})`,
      description: `[${TEST_MARKER}] Base realistic project for AIPMS Project Intelligence engine.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  if (projErr || !project) {
    throw new Error(`Failed to seed project: ${projErr?.message}`);
  }

  // 2. Active Sprint
  const { data: sprint, error: sprintErr } = await supabase
    .from('sprints')
    .insert({
      project_id: project.id,
      name: 'Sprint 1 - Core Delivery & Integration',
      status: 'ACTIVE',
      start_date: fiveDaysAgo,
      end_date: inFourDays,
    })
    .select()
    .single();

  if (sprintErr || !sprint) {
    throw new Error(`Failed to seed sprint: ${sprintErr?.message}`);
  }

  // 3. Tasks
  const taskPayloads = [
    { project_id: project.id, sprint_id: sprint.id, title: 'Database Schema & Migrations', status: 'DONE', priority: 'HIGH', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'User Authentication API', status: 'IN_PROGRESS', priority: 'CRITICAL', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'Core Task Management API', status: 'BLOCKED', priority: 'HIGH', due_date: inFourDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Sprint Planning Dashboard', status: 'BLOCKED', priority: 'MEDIUM', due_date: inFourDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Team Workload Visualization', status: 'TODO', priority: 'MEDIUM', due_date: inSevenDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Analytics & Reporting Service', status: 'IN_PROGRESS', priority: 'MEDIUM', due_date: inFourDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'AI Intelligence Integration', status: 'TODO', priority: 'HIGH', due_date: inSevenDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'E2E Testing & Quality Gate', status: 'TODO', priority: 'HIGH', due_date: inSevenDays },
    { project_id: project.id, title: 'Backlog: Dark Mode Theme Support', status: 'TODO', priority: 'LOW', due_date: null },
    { project_id: project.id, title: 'Backlog: Mobile Responsiveness Audit', status: 'TODO', priority: 'LOW', due_date: null },
  ];

  const { data: tasks, error: taskErr } = await supabase.from('tasks').insert(taskPayloads).select();
  if (taskErr || !tasks) throw new Error(`Failed to seed tasks: ${taskErr?.message}`);

  const taskMap = new Map(tasks.map((t) => [t.title, t.id]));
  const authTaskId = taskMap.get('User Authentication API');
  const taskApiId = taskMap.get('Core Task Management API');
  const sprintDashId = taskMap.get('Sprint Planning Dashboard');
  const workloadId = taskMap.get('Team Workload Visualization');

  // 4. Dependencies
  const depPayloads: Array<{ task_id: string; depends_on_task_id: string }> = [];
  if (authTaskId && taskApiId) depPayloads.push({ task_id: taskApiId, depends_on_task_id: authTaskId });
  if (taskApiId && sprintDashId) depPayloads.push({ task_id: sprintDashId, depends_on_task_id: taskApiId });
  if (taskApiId && workloadId) depPayloads.push({ task_id: workloadId, depends_on_task_id: taskApiId });

  let depIds: string[] = [];
  if (depPayloads.length > 0) {
    const { data: deps, error: depErr } = await supabase.from('task_dependencies').insert(depPayloads).select();
    if (!depErr && deps) depIds = deps.map((d) => d.id);
  }

  // 5. Risks
  const riskPayloads = [
    {
      project_id: project.id,
      title: 'Third-party OAuth Provider Latency & Downtime',
      description: 'External auth provider rate limits may degrade login response time.',
      probability: 4,
      impact: 5,
      risk_score: 20,
      status: 'IDENTIFIED',
      mitigation_plan: 'Implement local caching of validated public JWKS keys and session token store.',
      due_date: inFourDays,
    },
    {
      project_id: project.id,
      title: 'Database Connection Pool Saturation under High Concurrency',
      description: 'Concurrent reporting requests may exhaust available database connections.',
      probability: 2,
      impact: 5,
      risk_score: 10,
      status: 'MITIGATING',
      mitigation_plan: 'Configure Supabase connection pooling and transaction read replicas.',
      due_date: inSevenDays,
    },
    {
      project_id: project.id,
      title: 'Legacy Schema Incompatibility',
      description: 'Older table columns needed migration cleanup.',
      probability: 2,
      impact: 2,
      risk_score: 4,
      status: 'RESOLVED',
      mitigation_plan: 'Applied Postgres migration 20260101.',
      due_date: threeDaysAgo,
    },
  ];

  const { data: risks, error: riskErr } = await supabase.from('risks').insert(riskPayloads).select();
  if (riskErr) throw new Error(`Failed to seed risks: ${riskErr.message}`);

  return {
    testMarker: TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testSprintId: sprint.id,
    testTaskIds: tasks.map((t) => t.id),
    testDependencyIds: depIds,
    testRiskIds: risks ? risks.map((r) => r.id) : [],
  };
}

/**
 * Scenario A: Healthy Project
 * (High completion rate, 0 overdue, on-track velocity pace, 0 severe risks)
 */
export async function seedScenarioA_HealthyProject(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const inSixDays = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name: `${TEST_MARKER}: Scenario A - Healthy Delivery`,
      description: `[${TEST_MARKER}] Scenario A: High velocity, clean delivery.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  const { data: sprint } = await supabase
    .from('sprints')
    .insert({
      project_id: project.id,
      name: 'Sprint 1 - Green Delivery',
      status: 'ACTIVE',
      start_date: fiveDaysAgo,
      end_date: inSixDays,
    })
    .select()
    .single();

  const tasksData = [
    { project_id: project.id, sprint_id: sprint.id, title: 'Arch Spec', status: 'DONE', priority: 'HIGH', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'DB Schema', status: 'DONE', priority: 'HIGH', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Auth API', status: 'DONE', priority: 'HIGH', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'User CRUD', status: 'DONE', priority: 'MEDIUM', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Task Model', status: 'DONE', priority: 'MEDIUM', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'Sprint API', status: 'DONE', priority: 'HIGH', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'UI Dashboard', status: 'IN_PROGRESS', priority: 'MEDIUM', due_date: inSixDays },
    { project_id: project.id, sprint_id: sprint.id, title: 'E2E Testing', status: 'IN_PROGRESS', priority: 'LOW', due_date: inSixDays },
  ];

  const { data: tasks } = await supabase.from('tasks').insert(tasksData).select();

  const riskData = [
    {
      project_id: project.id,
      title: 'Minor Library Version Bump',
      description: 'Routine dependency upgrade required.',
      probability: 1,
      impact: 2,
      risk_score: 2,
      status: 'RESOLVED',
      mitigation_plan: 'Upgraded npm package to latest patch.',
      due_date: inSixDays,
    },
  ];
  const { data: risks } = await supabase.from('risks').insert(riskData).select();

  return {
    testMarker: TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testSprintId: sprint.id,
    testTaskIds: (tasks ?? []).map((t) => t.id),
    testDependencyIds: [],
    testRiskIds: (risks ?? []).map((r) => r.id),
  };
}

/**
 * Scenario C: Critical Project
 * (4 overdue tasks, 2 blocked tasks, 2 critical score 20 risks, velocity deficit)
 */
export async function seedScenarioC_CriticalProject(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name: `${TEST_MARKER}: Scenario C - Critical Incident`,
      description: `[${TEST_MARKER}] Scenario C: Severe blockers and overdue cascading failures.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  const { data: sprint } = await supabase
    .from('sprints')
    .insert({
      project_id: project.id,
      name: 'Sprint 1 - Degraded Milestone',
      status: 'ACTIVE',
      start_date: fiveDaysAgo,
      end_date: tomorrow,
    })
    .select()
    .single();

  const tasksData = [
    { project_id: project.id, sprint_id: sprint.id, title: 'Overdue Core Gateway', status: 'IN_PROGRESS', priority: 'CRITICAL', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'Overdue DB Migration', status: 'BLOCKED', priority: 'CRITICAL', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'Overdue Billing Worker', status: 'IN_PROGRESS', priority: 'HIGH', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'Overdue Notification Hook', status: 'IN_PROGRESS', priority: 'HIGH', due_date: threeDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, title: 'Blocked Frontend Shell', status: 'BLOCKED', priority: 'HIGH', due_date: tomorrow },
    { project_id: project.id, sprint_id: sprint.id, title: 'Blocked Report Generator', status: 'BLOCKED', priority: 'HIGH', due_date: tomorrow },
    { project_id: project.id, sprint_id: sprint.id, title: 'Initial Scaffold', status: 'DONE', priority: 'LOW', due_date: fiveDaysAgo },
  ];

  const { data: tasks } = await supabase.from('tasks').insert(tasksData).select();

  const riskData = [
    {
      project_id: project.id,
      title: 'Catastrophic Cloud Provider Outage',
      description: 'Primary database cluster uncontactable.',
      probability: 5,
      impact: 5,
      risk_score: 25,
      status: 'IDENTIFIED',
      mitigation_plan: 'Failover to multi-region disaster recovery standby.',
      due_date: tomorrow,
    },
    {
      project_id: project.id,
      title: 'Security Vulnerability in Token Parser',
      description: 'JWT verification bypass discovered.',
      probability: 4,
      impact: 5,
      risk_score: 20,
      status: 'IDENTIFIED',
      mitigation_plan: 'Patch express auth middleware to v2.4.0.',
      due_date: tomorrow,
    },
  ];
  const { data: risks } = await supabase.from('risks').insert(riskData).select();

  return {
    testMarker: TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testSprintId: sprint.id,
    testTaskIds: (tasks ?? []).map((t) => t.id),
    testDependencyIds: [],
    testRiskIds: (risks ?? []).map((r) => r.id),
  };
}

/**
 * Scenario D: Deep Dependency Bottlenecks
 * (Linear chain: T1 -> T2 -> T3 -> T4 -> T5 with fan-out to T6, T7)
 */
export async function seedScenarioD_DependencyBottlenecks(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name: `${TEST_MARKER}: Scenario D - Multi-Tier Graph`,
      description: `[${TEST_MARKER}] Scenario D: Complex dependency graph with sequential bottlenecks.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  const tasksData = [
    { project_id: project.id, title: 'Task 1: Base Core Engine', status: 'IN_PROGRESS', priority: 'HIGH', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 2: API Protocol Layer', status: 'BLOCKED', priority: 'HIGH', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 3: Service Mesh Proxy', status: 'BLOCKED', priority: 'HIGH', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 4: UI Shell Integration', status: 'BLOCKED', priority: 'MEDIUM', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 5: Final Release Gate', status: 'BLOCKED', priority: 'CRITICAL', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 6: Fanout Documentation', status: 'BLOCKED', priority: 'LOW', due_date: inFiveDays },
    { project_id: project.id, title: 'Task 7: Fanout Metric Telemetry', status: 'BLOCKED', priority: 'LOW', due_date: inFiveDays },
  ];

  const { data: tasks } = await supabase.from('tasks').insert(tasksData).select();
  const tMap = new Map((tasks ?? []).map((t) => [t.title, t.id]));

  const depData = [
    { task_id: tMap.get('Task 2: API Protocol Layer')!, depends_on_task_id: tMap.get('Task 1: Base Core Engine')! },
    { task_id: tMap.get('Task 3: Service Mesh Proxy')!, depends_on_task_id: tMap.get('Task 2: API Protocol Layer')! },
    { task_id: tMap.get('Task 4: UI Shell Integration')!, depends_on_task_id: tMap.get('Task 3: Service Mesh Proxy')! },
    { task_id: tMap.get('Task 5: Final Release Gate')!, depends_on_task_id: tMap.get('Task 4: UI Shell Integration')! },
    { task_id: tMap.get('Task 6: Fanout Documentation')!, depends_on_task_id: tMap.get('Task 2: API Protocol Layer')! },
    { task_id: tMap.get('Task 7: Fanout Metric Telemetry')!, depends_on_task_id: tMap.get('Task 2: API Protocol Layer')! },
  ];

  const { data: deps } = await supabase.from('task_dependencies').insert(depData).select();

  return {
    testMarker: TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testTaskIds: (tasks ?? []).map((t) => t.id),
    testDependencyIds: (deps ?? []).map((d) => d.id),
    testRiskIds: [],
  };
}

/**
 * Scenario E: Workload Imbalance
 * (Dev A: 8 active tasks, Dev B: 2 tasks, Dev C: 1 task)
 */
export async function seedScenarioE_WorkloadImbalance(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: project } = await supabase
    .from('projects')
    .insert({
      name: `${TEST_MARKER}: Scenario E - Skewed Workload`,
      description: `[${TEST_MARKER}] Scenario E: Skewed developer task assignments.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  const { data: team } = await supabase
    .from('teams')
    .insert({ project_id: project.id, name: 'Core Engineering Squad' })
    .select()
    .single();

  const devA = 'aaaaaaaa-1111-4aaa-aaaa-aaaaaaaaaaaa';
  const devB = 'bbbbbbbb-2222-4bbb-bbbb-bbbbbbbbbbbb';
  const devC = 'cccccccc-3333-4ccc-cccc-cccccccccccc';

  const { data: members } = await supabase
    .from('team_members')
    .insert([
      { team_id: team.id, user_id: devA, role: 'DEVELOPER' },
      { team_id: team.id, user_id: devB, role: 'DEVELOPER' },
      { team_id: team.id, user_id: devC, role: 'DEVELOPER' },
    ])
    .select();

  const tasksData: any[] = [];
  // 8 tasks assigned to Dev A
  for (let i = 1; i <= 8; i++) {
    tasksData.push({
      project_id: project.id,
      title: `Dev A Task #${i}`,
      assignee_id: devA,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      due_date: inSevenDays,
    });
  }
  // 2 tasks to Dev B
  for (let i = 1; i <= 2; i++) {
    tasksData.push({
      project_id: project.id,
      title: `Dev B Task #${i}`,
      assignee_id: devB,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      due_date: inSevenDays,
    });
  }
  // 1 task to Dev C
  tasksData.push({
    project_id: project.id,
    title: 'Dev C Task #1',
    assignee_id: devC,
    status: 'IN_PROGRESS',
    priority: 'LOW',
    due_date: inSevenDays,
  });

  const { data: tasks } = await supabase.from('tasks').insert(tasksData).select();

  return {
    testMarker: TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testTeamId: team.id,
    testTeamMemberIds: (members ?? []).map((m) => m.id),
    testTaskIds: (tasks ?? []).map((t) => t.id),
    testDependencyIds: [],
    testRiskIds: [],
  };
}

export const BEHAVIOR_TEST_MARKER = 'AIPMS_AI_BEHAVIOR_E2E_TEST';

/**
 * Phase 4 Behavior Validation Fixture (12 tasks, 5 dependencies, 4 risks, 4 team roles, 1 sprint)
 */
export async function seedBehaviorValidationFixture(
  supabase: SupabaseClient,
  ownerId?: string,
): Promise<SeededFixtureData> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: `${BEHAVIOR_TEST_MARKER}: AIPMS AI Behavior E2E Test Project`,
      description: `[${BEHAVIOR_TEST_MARKER}] Complete behavioral validation project.`,
      status: 'ACTIVE',
      owner_id: ownerId,
    })
    .select()
    .single();

  if (projErr || !project) throw new Error(`Failed to seed project: ${projErr?.message}`);

  // 2. Team & Members
  const pmUser = '11111111-1111-4111-a111-111111111111';
  const backendUser = '22222222-2222-4222-a222-222222222222';
  const frontendUser = '33333333-3333-4333-a333-333333333333';
  const qaUser = '44444444-4444-4444-a444-444444444444';

  const { data: team } = await supabase
    .from('teams')
    .insert({ project_id: project.id, name: 'Core Platform Engineering Squad' })
    .select()
    .single();

  const { data: members } = await supabase
    .from('team_members')
    .insert([
      { team_id: team.id, user_id: pmUser, role: 'PROJECT_MANAGER' },
      { team_id: team.id, user_id: backendUser, role: 'DEVELOPER' },
      { team_id: team.id, user_id: frontendUser, role: 'DEVELOPER' },
      { team_id: team.id, user_id: qaUser, role: 'QA' },
    ])
    .select();

  // 3. Sprint
  const { data: sprint } = await supabase
    .from('sprints')
    .insert({
      project_id: project.id,
      name: 'Sprint 1 — Core Platform',
      status: 'ACTIVE',
      start_date: fiveDaysAgo,
      end_date: inThreeDays,
    })
    .select()
    .single();

  // 4. Tasks (12 tasks: 5 DONE, 5 pending (3 IN_PROGRESS, 2 BLOCKED), 2 overdue)
  const taskPayloads = [
    { project_id: project.id, sprint_id: sprint.id, assignee_id: pmUser, title: 'Define system requirements', status: 'DONE', priority: 'HIGH', due_date: fiveDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, assignee_id: backendUser, title: 'Design database schema', status: 'DONE', priority: 'HIGH', due_date: fiveDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, assignee_id: backendUser, title: 'Create authentication API', status: 'DONE', priority: 'CRITICAL', due_date: fiveDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, assignee_id: backendUser, title: 'Implement project service', status: 'DONE', priority: 'HIGH', due_date: fiveDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, assignee_id: backendUser, title: 'Implement task service', status: 'DONE', priority: 'HIGH', due_date: fiveDaysAgo },
    { project_id: project.id, sprint_id: sprint.id, assignee_id: frontendUser, title: 'Implement frontend dashboard', status: 'IN_PROGRESS', priority: 'HIGH', due_date: twoDaysAgo }, // Overdue
    { project_id: project.id, sprint_id: sprint.id, assignee_id: frontendUser, title: 'Implement task board', status: 'IN_PROGRESS', priority: 'MEDIUM', due_date: twoDaysAgo }, // Overdue
    { project_id: project.id, sprint_id: sprint.id, assignee_id: frontendUser, title: 'Implement sprint management', status: 'BLOCKED', priority: 'MEDIUM', due_date: inThreeDays },
    { project_id: project.id, assignee_id: backendUser, title: 'Implement risk management', status: 'IN_PROGRESS', priority: 'MEDIUM', due_date: inSevenDays },
    { project_id: project.id, assignee_id: backendUser, title: 'Integrate AI service', status: 'BLOCKED', priority: 'HIGH', due_date: inSevenDays },
    { project_id: project.id, assignee_id: qaUser, title: 'Write integration tests', status: 'TODO', priority: 'HIGH', due_date: inSevenDays },
    { project_id: project.id, assignee_id: pmUser, title: 'Deploy application', status: 'TODO', priority: 'HIGH', due_date: inSevenDays },
  ];

  const { data: tasks, error: taskErr } = await supabase.from('tasks').insert(taskPayloads).select();
  if (taskErr || !tasks) throw new Error(`Failed to seed tasks: ${taskErr?.message}`);

  const taskMap = new Map(tasks.map((t) => [t.title, t.id]));
  const dbSchemaId = taskMap.get('Design database schema');
  const authId = taskMap.get('Create authentication API');
  const projServId = taskMap.get('Implement project service');
  const taskServId = taskMap.get('Implement task service');
  const dashId = taskMap.get('Implement frontend dashboard');
  const sprintMgmtId = taskMap.get('Implement sprint management');
  const aiServId = taskMap.get('Integrate AI service');
  const testsId = taskMap.get('Write integration tests');

  // 5. Dependencies (5+ dependency relationships)
  const depPayloads: Array<{ task_id: string; depends_on_task_id: string }> = [];
  if (dbSchemaId && authId) depPayloads.push({ task_id: authId, depends_on_task_id: dbSchemaId });
  if (authId && projServId) depPayloads.push({ task_id: projServId, depends_on_task_id: authId });
  if (projServId && taskServId) depPayloads.push({ task_id: taskServId, depends_on_task_id: projServId });
  if (taskServId && dashId) depPayloads.push({ task_id: dashId, depends_on_task_id: taskServId });
  if (taskServId && sprintMgmtId) depPayloads.push({ task_id: sprintMgmtId, depends_on_task_id: taskServId });
  if (authId && aiServId) depPayloads.push({ task_id: aiServId, depends_on_task_id: authId });
  if (aiServId && testsId) depPayloads.push({ task_id: testsId, depends_on_task_id: aiServId });

  let depIds: string[] = [];
  if (depPayloads.length > 0) {
    const { data: deps, error: depErr } = await supabase.from('task_dependencies').insert(depPayloads).select();
    if (!depErr && deps) depIds = deps.map((d) => d.id);
  }

  // 6. Risks (4 realistic risks)
  const riskPayloads = [
    {
      project_id: project.id,
      title: 'API integration delay',
      description: 'Upstream gateway routing delay on proxy calls.',
      probability: 4,
      impact: 4,
      risk_score: 16,
      status: 'IDENTIFIED',
      mitigation_plan: 'Increase proxy request timeout to 45s and retry failed connections.',
      due_date: inThreeDays,
    },
    {
      project_id: project.id,
      title: 'AI response latency',
      description: 'Local LLM inference latency under CPU contention.',
      probability: 4,
      impact: 3,
      risk_score: 12,
      status: 'IDENTIFIED',
      mitigation_plan: 'Implement 5s streaming timeout with deterministic fallback.',
      due_date: inSevenDays,
    },
    {
      project_id: project.id,
      title: 'Frontend integration dependency',
      description: 'Complex dashboard state requires async component loading.',
      probability: 3,
      impact: 4,
      risk_score: 12,
      status: 'MITIGATING',
      mitigation_plan: 'Modularize React components into independent suspense boundaries.',
      due_date: inThreeDays,
    },
    {
      project_id: project.id,
      title: 'Deployment configuration issue',
      description: 'Environment variable mismatch during release rollout.',
      probability: 2,
      impact: 4,
      risk_score: 8,
      status: 'IDENTIFIED',
      mitigation_plan: 'Add preflight configuration validator script.',
      due_date: inSevenDays,
    },
  ];

  const { data: risks } = await supabase.from('risks').insert(riskPayloads).select();

  return {
    testMarker: BEHAVIOR_TEST_MARKER,
    testUserId: ownerId,
    testProjectId: project.id,
    testProjectName: project.name,
    testSprintId: sprint.id,
    testTeamId: team.id,
    testTeamMemberIds: (members ?? []).map((m) => m.id),
    testTaskIds: tasks.map((t) => t.id),
    testDependencyIds: depIds,
    testRiskIds: risks ? risks.map((r) => r.id) : [],
  };
}

/**
 * Strict scoped cleanup in reverse dependency order:
 * task_dependencies -> risks -> tasks -> sprints -> team_members -> teams -> project
 */
export async function cleanupAiFixture(
  supabase: SupabaseClient,
  fixture: SeededFixtureData,
): Promise<void> {
  if (!fixture || !fixture.testProjectId) return;

  // 1. Delete task dependencies by recorded IDs
  if (fixture.testDependencyIds && fixture.testDependencyIds.length > 0) {
    await supabase
      .from('task_dependencies')
      .delete()
      .in('id', fixture.testDependencyIds);
  }

  // 2. Delete risks by recorded IDs
  if (fixture.testRiskIds && fixture.testRiskIds.length > 0) {
    await supabase
      .from('risks')
      .delete()
      .in('id', fixture.testRiskIds);
  } else {
    await supabase.from('risks').delete().eq('project_id', fixture.testProjectId);
  }

  // 3. Delete tasks by recorded IDs
  if (fixture.testTaskIds && fixture.testTaskIds.length > 0) {
    await supabase
      .from('tasks')
      .delete()
      .in('id', fixture.testTaskIds);
  } else {
    await supabase.from('tasks').delete().eq('project_id', fixture.testProjectId);
  }

  // 4. Delete sprints by recorded ID
  if (fixture.testSprintId) {
    await supabase
      .from('sprints')
      .delete()
      .eq('id', fixture.testSprintId);
  } else {
    await supabase.from('sprints').delete().eq('project_id', fixture.testProjectId);
  }

  // 5. Delete team_members by recorded IDs
  if (fixture.testTeamMemberIds && fixture.testTeamMemberIds.length > 0) {
    await supabase
      .from('team_members')
      .delete()
      .in('id', fixture.testTeamMemberIds);
  }

  // 6. Delete teams by recorded ID
  if (fixture.testTeamId) {
    await supabase
      .from('teams')
      .delete()
      .eq('id', fixture.testTeamId);
  } else {
    await supabase.from('teams').delete().eq('project_id', fixture.testProjectId);
  }

  // 7. Delete project by recorded ID
  await supabase
    .from('projects')
    .delete()
    .eq('id', fixture.testProjectId);
}

/**
 * Verify that all test records for the fixture were completely removed
 */
export async function verifyCleanup(
  supabase: SupabaseClient,
  fixture: SeededFixtureData,
): Promise<{
  isClean: boolean;
  remainingProjects: number;
  remainingTasks: number;
  remainingDependencies: number;
  remainingRisks: number;
  remainingSprints: number;
  remainingTeams: number;
  remainingTeamMembers: number;
}> {
  const [projRes, taskRes, depRes, riskRes, sprintRes, teamRes, memberRes] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('id', fixture.testProjectId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', fixture.testProjectId),
    fixture.testDependencyIds.length > 0
      ? supabase.from('task_dependencies').select('id', { count: 'exact', head: true }).in('id', fixture.testDependencyIds)
      : Promise.resolve({ count: 0, error: null }),
    supabase.from('risks').select('id', { count: 'exact', head: true }).eq('project_id', fixture.testProjectId),
    supabase.from('sprints').select('id', { count: 'exact', head: true }).eq('project_id', fixture.testProjectId),
    fixture.testTeamId
      ? supabase.from('teams').select('id', { count: 'exact', head: true }).eq('id', fixture.testTeamId)
      : Promise.resolve({ count: 0, error: null }),
    fixture.testTeamMemberIds && fixture.testTeamMemberIds.length > 0
      ? supabase.from('team_members').select('id', { count: 'exact', head: true }).in('id', fixture.testTeamMemberIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const remainingProjects = projRes.count ?? 0;
  const remainingTasks = taskRes.count ?? 0;
  const remainingDependencies = depRes.count ?? 0;
  const remainingRisks = riskRes.count ?? 0;
  const remainingSprints = sprintRes.count ?? 0;
  const remainingTeams = teamRes.count ?? 0;
  const remainingTeamMembers = memberRes.count ?? 0;

  const isClean =
    remainingProjects === 0 &&
    remainingTasks === 0 &&
    remainingDependencies === 0 &&
    remainingRisks === 0 &&
    remainingSprints === 0 &&
    remainingTeams === 0 &&
    remainingTeamMembers === 0;

  return {
    isClean,
    remainingProjects,
    remainingTasks,
    remainingDependencies,
    remainingRisks,
    remainingSprints,
    remainingTeams,
    remainingTeamMembers,
  };
}
