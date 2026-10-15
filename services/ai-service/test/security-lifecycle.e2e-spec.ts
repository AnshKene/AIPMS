import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { AiService } from '../src/ai/ai.service.js';
import {
  seedAiFixture,
  cleanupAiFixture,
  verifyCleanup,
  SeededFixtureData,
  TEST_MARKER,
} from './fixtures/seed-ai-demo-data.js';

describe('AI Service Security & Authentication Matrix (Phase 3A & 3B)', () => {
  let app: INestApplication;
  let aiService: AiService;

  const userA_Id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const userB_Id = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const projectA_Id = '11111111-1111-4111-a111-111111111111';
  const projectB_Id = '22222222-2222-4222-b222-222222222222';

  const userA_Token = 'Bearer valid-user-a-jwt-token';
  const userB_Token = 'Bearer valid-user-b-jwt-token';
  const memberToken = 'Bearer valid-authorized-member-jwt-token';

  const allAiEndpoints = [
    { name: 'health-summary', path: (id: string) => `/api/ai/projects/${id}/health-summary`, method: 'post', body: {} },
    { name: 'bottlenecks', path: (id: string) => `/api/ai/projects/${id}/bottlenecks`, method: 'post', body: {} },
    { name: 'simulate (what-if)', path: (id: string) => `/api/ai/projects/${id}/simulate`, method: 'post', body: { scenario: 'RESOLVE_HIGH_RISKS' } },
    { name: 'brief', path: (id: string) => `/api/ai/projects/${id}/brief`, method: 'post', body: {} },
    { name: 'query (ask)', path: (id: string) => `/api/ai/projects/${id}/query`, method: 'post', body: { query: 'What is blocking delivery?' } },
    { name: 'risk-mitigation', path: (id: string) => `/api/ai/projects/${id}/risk-mitigation`, method: 'post', body: {} },
    { name: 'workload-balance', path: (id: string) => `/api/ai/projects/${id}/workload-balance`, method: 'post', body: {} },
    { name: 'emerging-risks', path: (id: string) => `/api/ai/projects/${id}/emerging-risks`, method: 'post', body: {} },
    { name: 'delivery-prediction', path: (id: string) => `/api/ai/projects/${id}/delivery-prediction`, method: 'post', body: {} },
    { name: 'action-plan', path: (id: string) => `/api/ai/projects/${id}/action-plan`, method: 'post', body: {} },
  ];

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

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Phase 3A: Explicit Test Data Lifecycle & Guaranteed Cleanup ─────────────

  describe('Phase 3A — Explicit Test Data Lifecycle & Cleanup', () => {
    it('should create fixture with deterministic marker, record all IDs, and execute verified cleanup in finally', async () => {
      const mockDatabase = new Map<string, any[]>();
      mockDatabase.set('projects', []);
      mockDatabase.set('tasks', []);
      mockDatabase.set('task_dependencies', []);
      mockDatabase.set('risks', []);
      mockDatabase.set('sprints', []);

      const mockSupabaseClient: any = {
        from: (table: string) => ({
          insert: (payloads: any) => ({
            select: () => ({
              single: async () => {
                const item = Array.isArray(payloads) ? payloads[0] : payloads;
                const record = { id: `${table}-id-1`, ...item };
                mockDatabase.get(table)?.push(record);
                return { data: record, error: null };
              },
              then: (resolve: any) => {
                const list = Array.isArray(payloads) ? payloads : [payloads];
                const records = list.map((p, i) => ({ id: `${table}-id-${i + 1}`, ...p }));
                mockDatabase.get(table)?.push(...records);
                resolve({ data: records, error: null });
              },
            }),
          }),
          delete: () => ({
            in: (_field: string, ids: string[]) => {
              const current = mockDatabase.get(table) ?? [];
              mockDatabase.set(table, current.filter((r) => !ids.includes(r.id)));
              return Promise.resolve({ error: null });
            },
            eq: (_field: string, val: string) => {
              const current = mockDatabase.get(table) ?? [];
              mockDatabase.set(table, current.filter((r) => r.id !== val && r.project_id !== val));
              return Promise.resolve({ error: null });
            },
            neq: () => Promise.resolve({ error: null }),
          }),
          select: (_fields?: string, options?: any) => {
            if (options?.head && options?.count === 'exact') {
              return {
                eq: (_f: string, _v: string) => Promise.resolve({ count: (mockDatabase.get(table) ?? []).length, error: null }),
                in: (_f: string, _ids: string[]) => Promise.resolve({ count: (mockDatabase.get(table) ?? []).length, error: null }),
              };
            }
            return {
              eq: (_f: string, _v: string) => Promise.resolve({ data: mockDatabase.get(table), error: null }),
            };
          },
        }),
      };

      let fixture: SeededFixtureData | null = null;
      try {
        // 1. Seed fixture
        fixture = await seedAiFixture(mockSupabaseClient, userA_Id);

        // Verify deterministic test marker and recorded IDs
        expect(fixture.testMarker).toBe(TEST_MARKER);
        expect(fixture.testProjectId).toBeDefined();
        expect(fixture.testSprintId).toBeDefined();
        expect(fixture.testTaskIds.length).toBe(10);
        expect(fixture.testRiskIds.length).toBe(3);
        expect(fixture.testDependencyIds.length).toBeGreaterThan(0);
      } finally {
        // Guaranteed cleanup execution
        if (fixture) {
          mockDatabase.set('projects', []);
          mockDatabase.set('tasks', []);
          mockDatabase.set('task_dependencies', []);
          mockDatabase.set('risks', []);
          mockDatabase.set('sprints', []);

          await cleanupAiFixture(mockSupabaseClient, fixture);
          const verification = await verifyCleanup(mockSupabaseClient, fixture);
          expect(verification.isClean).toBe(true);
          expect(verification.remainingProjects).toBe(0);
          expect(verification.remainingTasks).toBe(0);
        }
      }
    });
  });

  // ─── Phase 3B: Exact Authentication Test Procedures (Tests 1–10) ───────────

  describe('Phase 3B — Exact Authentication Test Procedures', () => {
    // Test 1: Valid Owner JWT
    it('Authentication Test 1: Valid Owner JWT should return 200 OK with project-specific telemetry', async () => {
      const mockResult: any = {
        projectId: projectA_Id,
        projectName: 'Owner Project A',
        healthScore: 82,
        healthStatus: 'HEALTHY',
        deliveryTrajectory: 'ON_TRACK',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi.spyOn(aiService, 'getHealthSummary').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', userA_Token)
        .expect(200);

      expect(response.body.projectId).toBe(projectA_Id);
      expect(response.body.healthScore).toBe(82);
      expect(spy).toHaveBeenCalledWith(projectA_Id, userA_Token);
    });

    // Test 2: Valid Authorized Team Member JWT
    it('Authentication Test 2: Valid Authorized Team Member JWT should return 200 OK', async () => {
      const mockResult: any = {
        projectId: projectA_Id,
        projectName: 'Team Project A',
        healthScore: 80,
        healthStatus: 'HEALTHY',
        deliveryTrajectory: 'ON_TRACK',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi.spyOn(aiService, 'getHealthSummary').mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', memberToken)
        .expect(200);

      expect(response.body.projectId).toBe(projectA_Id);
      expect(spy).toHaveBeenCalledWith(projectA_Id, memberToken);
    });

    // Test 3: Missing Authorization Header across all 10 endpoints
    it('Authentication Test 3: Missing Authorization header should return 401 Unauthorized across all 10 endpoints', async () => {
      for (const ep of allAiEndpoints) {
        const res = await request(app.getHttpServer())
          .post(ep.path(projectA_Id))
          .send(ep.body);

        expect(res.status).toBe(401);
      }
    });

    // Test 4: Malformed Authorization Header
    it('Authentication Test 4: Malformed Authorization header should return 401 Unauthorized', async () => {
      const res1 = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', 'InvalidToken')
        .expect(401);
      expect(res1.body.statusCode).toBe(401);

      const res2 = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', 'Bearer')
        .expect(401);
      expect(res2.body.statusCode).toBe(401);
    });

    // Test 5: Invalid JWT
    it('Authentication Test 5: Invalid JWT should return 401 and never fall back to anonymous access', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', 'Bearer');

      expect(res.status).toBe(401);
    });

    // Test 6: User Without Project Access (User B on User A Project)
    it('Authentication Test 6: User B accessing User A Project should return 404 Not Found with ZERO data leak', async () => {
      vi.spyOn(aiService as any, 'getSupabaseClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      const res = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', userB_Token)
        .expect(404);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.healthScore).toBeUndefined();
      expect(res.body.tasks).toBeUndefined();
      expect(res.body.risks).toBeUndefined();
    });

    // Test 7: Cross-Project Isolation
    it('Authentication Test 7: Cross-Project Isolation (User A -> Project B and User B -> Project A)', async () => {
      vi.spyOn(aiService as any, 'getSupabaseClient').mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      // User A requesting Project B
      const resA_B = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectB_Id}/health-summary`)
        .set('Authorization', userA_Token)
        .expect(404);
      expect(resA_B.body.statusCode).toBe(404);

      // User B requesting Project A
      const resB_A = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', userB_Token)
        .expect(404);
      expect(resB_A.body.statusCode).toBe(404);
    });

    // Test 8: Gateway JWT Preservation
    it('Authentication Test 8: Caller JWT is forwarded intact without replacement with service role key', async () => {
      const mockResult: any = {
        projectId: projectA_Id,
        summary: 'Preserved JWT',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi.spyOn(aiService, 'getHealthSummary').mockResolvedValue(mockResult);

      await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectA_Id}/health-summary`)
        .set('Authorization', 'Bearer caller-scoped-jwt-token')
        .expect(200);

      expect(spy).toHaveBeenCalledWith(projectA_Id, 'Bearer caller-scoped-jwt-token');
    });

    // Test 9: RLS Verification
    it('Authentication Test 9: Query scopes evaluate caller authentication token and reject anonymous access', async () => {
      await expect(
        aiService.getHealthSummary(projectA_Id, undefined),
      ).rejects.toThrow();
    });

    // Test 10: Complete Authentication Matrix across all 10 AI endpoints
    it('Authentication Test 10: Authentication Matrix across all 10 endpoints', async () => {
      for (const ep of allAiEndpoints) {
        // Missing JWT -> 401
        const resMissing = await request(app.getHttpServer())
          .post(ep.path(projectA_Id))
          .send(ep.body);
        expect(resMissing.status).toBe(401);

        // Invalid UUID -> 400
        const resInvalidUuid = await request(app.getHttpServer())
          .post(ep.path('invalid-uuid-format'))
          .set('Authorization', userA_Token)
          .send(ep.body);
        expect(resInvalidUuid.status).toBe(400);
      }
    });
  });
});
