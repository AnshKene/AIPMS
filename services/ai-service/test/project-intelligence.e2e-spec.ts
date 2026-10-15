import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { AiService } from '../src/ai/ai.service.js';
import { SimulationScenarioType } from '../src/ai/dto/ai-request.dto.js';
import {
  seedAiFixture,
  seedScenarioA_HealthyProject,
  seedScenarioC_CriticalProject,
  seedScenarioD_DependencyBottlenecks,
  seedScenarioE_WorkloadImbalance,
  cleanupAiFixture,
  verifyCleanup,
  SeededFixtureData,
  TEST_MARKER,
} from './fixtures/seed-ai-demo-data.js';
import { randomUUID } from 'node:crypto';

describe('AIPMS Project Intelligence Engine — Complete Scenario Validation Suite', () => {
  let app: INestApplication;
  let aiService: AiService;

  const testAuthHeader = 'Bearer realistic-ai-e2e-jwt-token';
  const testUserId = randomUUID();

  // In-memory persistent mock database simulating Supabase tables
  const db = {
    projects: [] as any[],
    sprints: [] as any[],
    tasks: [] as any[],
    task_dependencies: [] as any[],
    risks: [] as any[],
    teams: [] as any[],
    team_members: [] as any[],
  };

  const createMockSupabase = () => ({
    rpc: () => Promise.resolve({ data: true, error: null }),
    from: (table: keyof typeof db) => ({
      select: (fields?: string, options?: any) => {
        let tableData = [...(db[table] || [])];
        const queryBuilder: any = {
          eq: (field: string, val: any) => {
            tableData = tableData.filter((r) => r[field] === val);
            if (options?.head && options?.count === 'exact') {
              return Promise.resolve({ count: tableData.length, data: null, error: null });
            }
            return queryBuilder;
          },
          in: (field: string, vals: any[]) => {
            tableData = tableData.filter((r) => vals.includes(r[field]));
            if (options?.head && options?.count === 'exact') {
              return Promise.resolve({ count: tableData.length, data: null, error: null });
            }
            return queryBuilder;
          },
          order: () => queryBuilder,
          limit: () => queryBuilder,
          maybeSingle: () => Promise.resolve({ data: tableData[0] ?? null, error: null }),
          single: () => Promise.resolve({ data: tableData[0] ?? null, error: null }),
          then: (resolve: any) => resolve({ data: tableData, error: null }),
        };
        return queryBuilder;
      },
      insert: (payloads: any) => {
        const list = Array.isArray(payloads) ? payloads : [payloads];
        const created = list.map((item) => ({
          id: item.id || randomUUID(),
          created_at: new Date().toISOString(),
          ...item,
        }));
        (db[table] as any[]).push(...created);

        return {
          select: () => ({
            single: () => Promise.resolve({ data: created[0], error: null }),
            then: (resolve: any) => resolve({ data: created, error: null }),
          }),
        };
      },
      delete: () => ({
        in: (field: string, ids: string[]) => {
          db[table] = (db[table] as any[]).filter((r) => !ids.includes(r[field]));
          return Promise.resolve({ error: null });
        },
        eq: (field: string, val: string) => {
          db[table] = (db[table] as any[]).filter(
            (r) => r[field] !== val && r.project_id !== val && r.id !== val,
          );
          return Promise.resolve({ error: null });
        },
        neq: () => Promise.resolve({ error: null }),
      }),
    }),
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    aiService = moduleFixture.get<AiService>(AiService);

    // Provide mock Supabase client pointing to deterministic test DB
    (aiService as any).getSupabaseClient = () => createMockSupabase();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── SCENARIO A: HEALTHY PROJECT ─────────────────────────────────────────────

  describe('Scenario A — Healthy Project Evaluation', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedScenarioA_HealthyProject(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should compute high health score (>= 80), ON_TRACK trajectory, and 0 critical warnings', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/health-summary`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.healthScore).toBeGreaterThanOrEqual(80);
      expect(res.body.healthStatus).toBe('HEALTHY');
      expect(res.body.deliveryTrajectory).toBe('ON_TRACK');
      expect(res.body.riskExposure).toBe('LOW');

      // No critical signals
      const criticalSignals = (res.body.signals || []).filter((s: any) => s.severity === 'CRITICAL');
      expect(criticalSignals.length).toBe(0);
    });
  });

  // ─── SCENARIO B: AT-RISK PROJECT ─────────────────────────────────────────────

  describe('Scenario B — At-Risk Base Delivery Project', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should reflect moderate penalties for overdue tasks and high risk, generating explainable signals', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/health-summary`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.healthScore).toBeLessThan(85);
      expect(['MODERATE_RISK', 'AT_RISK', 'CRITICAL']).toContain(res.body.healthStatus);
      expect(res.body.signals.length).toBeGreaterThan(0);

      // Verify signals cite concrete project entities
      const hasOverdueSignal = res.body.signals.some((s: any) => s.category === 'SCHEDULE');
      const hasRiskSignal = res.body.signals.some((s: any) => s.category === 'RISK');
      expect(hasOverdueSignal || hasRiskSignal).toBe(true);
    });
  });

  // ─── SCENARIO C: CRITICAL PROJECT ────────────────────────────────────────────

  describe('Scenario C — Critical Project Evaluation', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedScenarioC_CriticalProject(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should compute degraded health score (< 40), CRITICAL status, and BEHIND_SCHEDULE trajectory', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/health-summary`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.healthScore).toBeLessThanOrEqual(40);
      expect(res.body.healthStatus).toBe('CRITICAL');
      expect(res.body.deliveryTrajectory).toBe('BEHIND_SCHEDULE');
      expect(['HIGH', 'CRITICAL']).toContain(res.body.riskExposure);

      const criticalWarnings = res.body.signals.filter((s: any) => s.severity === 'CRITICAL');
      expect(criticalWarnings.length).toBeGreaterThan(0);
    });
  });

  // ─── SCENARIO D: DEPENDENCY BOTTLENECKS & CYCLE DETECTION ────────────────────

  describe('Scenario D — Multi-Tier Dependency Bottlenecks & Cycles', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedScenarioD_DependencyBottlenecks(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should detect longest critical path spanning >= 4 sequential tasks and cascading blockers', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/bottlenecks`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.hasCycles).toBe(false);
      expect(res.body.longestDependencyChain.length).toBeGreaterThanOrEqual(4);
      expect(res.body.cascadingBlockers.length).toBeGreaterThan(0);
      expect(res.body.dependencyPressure).toBe('HIGH');
    });

    it('should detect circular dependency links and provide corrective recommendation', async () => {
      const tasks = db.tasks.filter((t) => t.project_id === fixture.testProjectId);
      const t1 = tasks.find((t) => t.title.includes('Task 1'));
      const t5 = tasks.find((t) => t.title.includes('Task 5'));

      // Inject cycle: Task 1 depends on Task 5
      const { data: cycleDep } = await (createMockSupabase() as any)
        .from('task_dependencies')
        .insert({ task_id: t1.id, depends_on_task_id: t5.id })
        .select()
        .single();

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/bottlenecks`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.hasCycles).toBe(true);

      // Clean cyclic edge
      await (createMockSupabase() as any).from('task_dependencies').delete().eq('id', cycleDep.id);
    });
  });

  // ─── SCENARIO E: WORKLOAD IMBALANCE ──────────────────────────────────────────

  describe('Scenario E — Workload Imbalance & Capacity Optimization', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedScenarioE_WorkloadImbalance(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should identify overloaded team member (Dev A with 8 tasks) and suggest capacity rebalancing', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/workload-balance`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.recommendations.length).toBeGreaterThan(0);

      // Summary or insights should note overload concentration
      expect(
        res.body.insights.some((ins: string) => ins.toLowerCase().includes('overload') || ins.toLowerCase().includes('active task') || ins.toLowerCase().includes('member')),
      ).toBe(true);
    });
  });

  // ─── WHAT-IF SIMULATOR SCENARIOS ────────────────────────────────────────────

  describe('What-If Project Simulator Validations', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should simulate RESOLVE_HIGH_RISKS with health delta and unmutated DB state', async () => {
      const tasksBefore = db.tasks.length;
      const risksBefore = db.risks.length;

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/simulate`)
        .set('Authorization', testAuthHeader)
        .send({ scenario: SimulationScenarioType.RESOLVE_HIGH_RISKS })
        .expect(200);

      expect(res.body.isSimulation).toBe(true);
      expect(res.body.delta.healthScoreDelta).toBeGreaterThan(0);
      expect(res.body.delta.highSeverityRisksDelta).toBeLessThan(0);

      // Verify DB unchanged
      expect(db.tasks.length).toBe(tasksBefore);
      expect(db.risks.length).toBe(risksBefore);
    });

    it('should reject EXTEND_SPRINT_DEADLINE if no active sprint exists', async () => {
      const { data: emptyProj } = await (createMockSupabase() as any)
        .from('projects')
        .insert({ name: `${TEST_MARKER} No Sprint Proj`, status: 'ACTIVE' })
        .select()
        .single();

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${emptyProj.id}/simulate`)
        .set('Authorization', testAuthHeader)
        .send({ scenario: SimulationScenarioType.EXTEND_SPRINT_DEADLINE, extendDays: 5 })
        .expect(400);

      expect(res.body.message).toContain('Scenario unavailable: No active sprint exists.');

      await (createMockSupabase() as any).from('projects').delete().eq('id', emptyProj.id);
    });
  });

  // ─── EXECUTIVE PROJECT BRIEF ────────────────────────────────────────────────

  describe('Executive Project Brief Generator', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should generate structured brief with accomplishments, risks, and action plan from actual evidence', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/brief`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.executiveSummary).toBeDefined();
      expect(res.body.whatIsGoingWell.length).toBeGreaterThan(0);
      expect(res.body.whatNeedsAttention.length).toBeGreaterThan(0);
      expect(res.body.topDeliveryRisks.length).toBeGreaterThan(0);
      expect(res.body.actionPlan.length).toBeGreaterThan(0);
      expect(['ollama', 'deterministic-fallback']).toContain(res.body.generatedBy);
    });
  });

  // ─── ASK PROJECT AI (NATURAL LANGUAGE QUERIES) ──────────────────────────────

  describe('Ask Project AI (Fact-Grounded Natural Language Querying)', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    const coreQuestions = [
      'What is blocking this project?',
      'Which risks threaten our sprint?',
      'How is team workload distributed?',
      'What should we prioritize today?',
      'How many overdue tasks do we have?',
      'Which task is on the critical path?',
      'Which team member has the highest workload?',
      'Why is this project considered at risk?',
    ];

    for (const question of coreQuestions) {
      it(`should answer: "${question}" grounded in project evidence`, async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/ai/projects/${fixture.testProjectId}/query`)
          .set('Authorization', testAuthHeader)
          .send({ query: question })
          .expect(200);

        expect(res.body.projectId).toBe(fixture.testProjectId);
        expect(res.body.answer).toBeDefined();
        expect(res.body.answer.length).toBeGreaterThan(10);
        expect(res.body.evidence).toBeDefined();
        expect(res.body.evidence.length).toBeGreaterThan(0);
        expect(res.body.suggestedQuestions.length).toBeGreaterThan(0);
        expect(['ollama', 'deterministic-fallback']).toContain(res.body.generatedBy);
      });
    }
  });

  // ─── AI RISK MITIGATION ─────────────────────────────────────────────────────

  describe('AI Risk Mitigation Analysis', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should generate targeted mitigation actions for high-severity risk and never report zero risks', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/risk-mitigation`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.summary).not.toContain('No High-Severity Risks Identified');
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.insights.length).toBeGreaterThan(0);
    });
  });

  // ─── CROSS-MODULE EVIDENCE CONSISTENCY ──────────────────────────────────────

  describe('Cross-Module Evidence Consistency', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedAiFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    it('should maintain consistent evidence across Health, Bottlenecks, Risks, and Ask AI', async () => {
      const [healthRes, bottleneckRes, riskRes, briefRes, askBlockersRes] = await Promise.all([
        request(app.getHttpServer()).post(`/api/ai/projects/${fixture.testProjectId}/health-summary`).set('Authorization', testAuthHeader),
        request(app.getHttpServer()).post(`/api/ai/projects/${fixture.testProjectId}/bottlenecks`).set('Authorization', testAuthHeader),
        request(app.getHttpServer()).post(`/api/ai/projects/${fixture.testProjectId}/risk-mitigation`).set('Authorization', testAuthHeader),
        request(app.getHttpServer()).post(`/api/ai/projects/${fixture.testProjectId}/brief`).set('Authorization', testAuthHeader),
        request(app.getHttpServer()).post(`/api/ai/projects/${fixture.testProjectId}/query`).set('Authorization', testAuthHeader).send({ query: 'Which tasks are currently blocking project delivery?' }),
      ]);

      expect(healthRes.status).toBe(200);
      expect(bottleneckRes.status).toBe(200);
      expect(riskRes.status).toBe(200);
      expect(briefRes.status).toBe(200);
      expect(askBlockersRes.status).toBe(200);

      // Bottleneck consistency
      expect(bottleneckRes.body.cascadingBlockers.length).toBeGreaterThan(0);
      expect(askBlockersRes.body.evidence.length).toBeGreaterThan(0);

      // Risk consistency
      expect(healthRes.body.metrics.unresolvedRisksCount).toBeGreaterThan(0);
      expect(briefRes.body.topDeliveryRisks.length).toBeGreaterThan(0);
      expect(riskRes.body.summary).not.toContain('No High-Severity Risks');
    });
  });

  // ─── STRICT CLEANUP AUDIT ───────────────────────────────────────────────────

  describe('Strict Cleanup Verification', () => {
    it('should cleanly remove all seeded test entities across all tables', async () => {
      const mockSupabase = createMockSupabase() as any;
      const fixture = await seedAiFixture(mockSupabase, testUserId);

      const beforeCheck = await verifyCleanup(mockSupabase, fixture);
      expect(beforeCheck.isClean).toBe(false);

      await cleanupAiFixture(mockSupabase, fixture);

      const afterCheck = await verifyCleanup(mockSupabase, fixture);
      expect(afterCheck.isClean).toBe(true);
      expect(afterCheck.remainingProjects).toBe(0);
      expect(afterCheck.remainingTasks).toBe(0);
      expect(afterCheck.remainingDependencies).toBe(0);
      expect(afterCheck.remainingRisks).toBe(0);
      expect(afterCheck.remainingSprints).toBe(0);
      expect(afterCheck.remainingTeams).toBe(0);
      expect(afterCheck.remainingTeamMembers).toBe(0);
    });
  });
});
