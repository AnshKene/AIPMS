import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { AiService } from '../src/ai/ai.service.js';
import { OllamaService } from '../src/ai/ollama.service.js';
import { SimulationScenarioType } from '../src/ai/dto/ai-request.dto.js';
import {
  seedBehaviorValidationFixture,
  cleanupAiFixture,
  verifyCleanup,
  SeededFixtureData,
  BEHAVIOR_TEST_MARKER,
} from './fixtures/seed-ai-demo-data.js';
import { randomUUID } from 'node:crypto';

describe('AIPMS Phase 4 — Complete AI Intelligence Behavioral Validation', () => {
  let app: INestApplication;
  let aiService: AiService;
  let ollamaService: OllamaService;

  const testAuthHeader = 'Bearer behavior-ai-e2e-jwt-token';
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
    ollamaService = moduleFixture.get<OllamaService>(OllamaService);

    // Provide mock Supabase client pointing to deterministic test DB
    (aiService as any).getSupabaseClient = () => createMockSupabase();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── BEHAVIORAL VALIDATION SUITE ─────────────────────────────────────────────

  describe('Full End-to-End Behavioral Suite with Realistic Telemetry', () => {
    let fixture: SeededFixtureData;

    beforeAll(async () => {
      fixture = await seedBehaviorValidationFixture(createMockSupabase() as any, testUserId);
    });

    afterAll(async () => {
      await cleanupAiFixture(createMockSupabase() as any, fixture);
    });

    // 1. Health & Early Warnings
    it('1. Health & Early Warnings: calculates accurate health score and non-INSUFFICIENT_DATA trajectory', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/health-summary`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      // Health score must reflect penalties for 2 overdue tasks, 2 blocked tasks, and 3 severe risks
      expect(res.body.healthScore).toBeLessThanOrEqual(75);
      expect(['MODERATE_RISK', 'AT_RISK', 'CRITICAL']).toContain(res.body.healthStatus);

      // Trajectory must reflect active sprint velocity pace, NOT INSUFFICIENT_DATA
      expect(['BEHIND_SCHEDULE', 'AT_RISK', 'ON_TRACK']).toContain(res.body.deliveryTrajectory);
      expect(res.body.deliveryTrajectory).not.toBe('INSUFFICIENT_DATA');

      // Check metrics snapshot
      expect(res.body.metrics.totalTasks).toBe(12);
      expect(res.body.metrics.completedTasks).toBe(5);
      expect(res.body.metrics.overdueTasks).toBe(2);
      expect(res.body.metrics.blockedTasks).toBe(2);

      // Explainable Signals
      expect(res.body.signals.length).toBeGreaterThan(0);
      for (const signal of res.body.signals) {
        expect(signal.title).toBeDefined();
        expect(signal.severity).toBeDefined();
        expect(signal.observation).toBeDefined();
        expect(signal.evidence.length).toBeGreaterThan(0);
        expect(signal.reasoning).toBeDefined();
        expect(signal.recommendation).toBeDefined();
      }

      // Data Sufficiency
      expect(res.body.dataSufficiency).toBeDefined();
      expect(res.body.dataSufficiency.sufficient).toBe(true);
      expect(res.body.dataSufficiency.level).toBe('FULL');
    });

    // 2. Dependency Bottlenecks
    it('2. Dependency Bottlenecks: identifies critical path chain and cascading blockers', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/bottlenecks`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.totalTasks).toBe(12);
      expect(res.body.dependencyCount).toBeGreaterThanOrEqual(5);
      expect(res.body.hasCycles).toBe(false);

      // Longest sequential path (DB schema -> Auth API -> Project Service -> Task Service -> Dashboard/Sprint)
      expect(res.body.longestDependencyChain.length).toBeGreaterThanOrEqual(4);
      expect(res.body.longestDependencyChain).toContain('Design database schema');

      // Cascading Blockers
      expect(res.body.cascadingBlockers.length).toBeGreaterThan(0);
      expect(res.body.cascadingBlockers[0].blockedTasksCount).toBeGreaterThanOrEqual(1);
    });

    // 3. What-If Simulator
    it('3. What-If Simulator: produces meaningful distinct projections without mutating DB', async () => {
      const tasksBefore = db.tasks.length;
      const risksBefore = db.risks.length;

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/simulate`)
        .set('Authorization', testAuthHeader)
        .send({ scenario: SimulationScenarioType.RESOLVE_HIGH_RISKS })
        .expect(200);

      expect(res.body.isSimulation).toBe(true);
      expect(res.body.baseline.healthScore).toBeDefined();
      expect(res.body.simulated.healthScore).toBeGreaterThan(res.body.baseline.healthScore);
      expect(res.body.delta.healthScoreDelta).toBeGreaterThan(0);
      expect(res.body.tradeOffs.length).toBeGreaterThan(0);

      // DB remains completely unmutated
      expect(db.tasks.length).toBe(tasksBefore);
      expect(db.risks.length).toBe(risksBefore);
    });

    // 4. Executive Project Brief
    it('4. Executive Brief: produces grounded summary, key accomplishments, risks, and action plan', async () => {
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

    // 5. Ask Project AI (6 exact questions from Section 5.E)
    const exactQuestions = [
      'What is blocking this project?',
      'Which risks threaten our sprint?',
      'How is team workload distributed?',
      'What should we prioritize today?',
      'Which tasks are overdue?',
      'Which tasks are on the critical path?',
    ];

    for (const question of exactQuestions) {
      it(`5. Ask Project AI: answers "${question}" grounded in actual evidence`, async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/ai/projects/${fixture.testProjectId}/query`)
          .set('Authorization', testAuthHeader)
          .send({ query: question })
          .expect(200);

        expect(res.body.projectId).toBe(fixture.testProjectId);
        expect(res.body.answer).toBeDefined();
        expect(res.body.answer.length).toBeGreaterThan(15);
        expect(res.body.evidence.length).toBeGreaterThan(0);
        expect(res.body.suggestedQuestions.length).toBeGreaterThan(0);
        expect(['ollama', 'deterministic-fallback']).toContain(res.body.generatedBy);
      });
    }

    // 6. AI Risk Mitigation
    it('6. Risk Mitigation: detects high-severity risks and returns actionable containment plans', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/risk-mitigation`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.summary).not.toContain('No High-Severity Risks Identified');
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.risks.length).toBeGreaterThan(0);
      expect(res.body.metrics.highSeverityRisksCount).toBeGreaterThan(0);
    });

    // 7. Workload Balance
    it('7. Workload Balance: analyzes member allocations across all 4 team roles', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/workload-balance`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.insights.length).toBeGreaterThan(0);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });

    // 8. Emerging Risks
    it('8. Emerging Risks: detects compounding risk patterns from overdue and blocked items', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/emerging-risks`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.emergingRisks).toBeDefined();
      expect(Array.isArray(res.body.emergingRisks)).toBe(true);
      expect(res.body.emergingRisks.length).toBeGreaterThan(0);
    });

    // 9. Delivery Prediction
    it('9. Delivery Prediction: outputs fact-grounded trajectory projection with confidence', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/delivery-prediction`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(['ON_TRACK', 'BEHIND_SCHEDULE', 'AT_RISK', 'INSUFFICIENT_DATA']).toContain(res.body.deliveryTrajectory);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(res.body.confidence);
      expect(res.body.confidencePercentage).toBeGreaterThanOrEqual(0);
      expect(res.body.confidencePercentage).toBeLessThanOrEqual(100);
      expect(res.body.signals.length).toBeGreaterThan(0);
      expect(res.body.summary).toBeDefined();
    });

    // 10. Action Plan
    it('10. Action Plan: prioritizes concrete engineering steps addressing blockers and overdue tasks', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/action-plan`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.projectId).toBe(fixture.testProjectId);
      expect(res.body.actions).toBeDefined();
      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions.length).toBeGreaterThan(0);
      for (const item of res.body.actions) {
        expect(item.title).toBeDefined();
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(item.priority);
        expect(['BLOCKER', 'RISK', 'WORKLOAD', 'SCHEDULE', 'SCOPE']).toContain(item.category);
        expect(item.description).toBeDefined();
      }
    });

    // 11. Mode 2 — Ollama Unavailable Simulation
    it('11. Mode 2 (Ollama Unavailable): switches truthfully to deterministic fallback without crashing', async () => {
      // Mock callOllama to return null (simulating service downtime)
      const callSpy = vi.spyOn(ollamaService as any, 'callOllama').mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${fixture.testProjectId}/brief`)
        .set('Authorization', testAuthHeader)
        .expect(200);

      expect(res.body.generatedBy).toBe('deterministic-fallback');
      expect(res.body.executiveSummary).toBeDefined();
      expect(res.body.actionPlan.length).toBeGreaterThan(0);

      callSpy.mockRestore();
    });

    // 12. Cleanup Verification
    it('12. Scoped Cleanup: deletes fixture in reverse order leaving 0 test entities', async () => {
      const mockSupabase = createMockSupabase() as any;
      const cleanCheckBefore = await verifyCleanup(mockSupabase, fixture);
      expect(cleanCheckBefore.isClean).toBe(false);

      await cleanupAiFixture(mockSupabase, fixture);

      const cleanCheckAfter = await verifyCleanup(mockSupabase, fixture);
      expect(cleanCheckAfter.isClean).toBe(true);
      expect(cleanCheckAfter.remainingProjects).toBe(0);
      expect(cleanCheckAfter.remainingTasks).toBe(0);
      expect(cleanCheckAfter.remainingDependencies).toBe(0);
      expect(cleanCheckAfter.remainingRisks).toBe(0);
      expect(cleanCheckAfter.remainingSprints).toBe(0);
      expect(cleanCheckAfter.remainingTeams).toBe(0);
      expect(cleanCheckAfter.remainingTeamMembers).toBe(0);
    });
  });
});
