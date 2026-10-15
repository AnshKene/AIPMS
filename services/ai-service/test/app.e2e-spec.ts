import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { AiService } from '../src/ai/ai.service.js';
import { SimulationScenarioType } from '../src/ai/dto/ai-request.dto.js';

describe('AI Intelligence Service (e2e)', () => {
  let app: INestApplication;
  let aiService: AiService;

  const projectUuid = '11111111-1111-4111-a111-111111111111';

  beforeEach(async () => {
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

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ─── Health ──────────────────────────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('AIPMS AI Intelligence Service');
    });
  });

  // ─── POST /api/ai/projects/:projectId/health-summary ────────────────────────

  describe('POST /api/ai/projects/:projectId/health-summary', () => {
    it('should return 200 with health summary and forward Authorization header', async () => {
      const mockResult = {
        projectId: projectUuid,
        analysisType: 'health-summary',
        summary: 'Project Alpha is progressing steadily.',
        insights: ['Overdue tasks controlled', 'Active sprint underway'],
        recommendations: ['Maintain current velocity'],
        metrics: { totalTasks: 10, completionRate: '50%' },
        generatedAt: new Date().toISOString(),
        generatedBy: 'deterministic-fallback',
      };

      const spy = vi
        .spyOn(aiService, 'getHealthSummary')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/health-summary`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });

    it('should return 400 Bad Request on invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/projects/invalid-id/health-summary')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── POST /api/ai/projects/:projectId/risk-mitigation ───────────────────────

  describe('POST /api/ai/projects/:projectId/risk-mitigation', () => {
    it('should return 200 with risk mitigation and forward Authorization header', async () => {
      const mockResult = {
        projectId: projectUuid,
        analysisType: 'risk-mitigation',
        summary: '2 high-severity risks require mitigation.',
        insights: ['Risk #1: Database overload', 'Risk #2: Third-party timeout'],
        recommendations: ['Add connection pooling', 'Implement circuit breaker'],
        metrics: { highRiskCount: 2 },
        generatedAt: new Date().toISOString(),
        generatedBy: 'deterministic-fallback',
      };

      const spy = vi
        .spyOn(aiService, 'getRiskMitigation')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/risk-mitigation`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/workload-balance ──────────────────────

  describe('POST /api/ai/projects/:projectId/workload-balance', () => {
    it('should return 200 with workload balance recommendations', async () => {
      const mockResult = {
        projectId: projectUuid,
        analysisType: 'workload-balance',
        summary: 'Workload is skewed towards Lead Engineer.',
        insights: ['Lead Engineer has 8 active tasks', '3 tasks unassigned'],
        recommendations: ['Reassign unassigned tasks to available devs'],
        metrics: { totalTasks: 12, maxActiveOnSingleUser: 8 },
        generatedAt: new Date().toISOString(),
        generatedBy: 'deterministic-fallback',
      };

      const spy = vi
        .spyOn(aiService, 'getWorkloadBalance')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/workload-balance`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/bottlenecks ───────────────────────────

  describe('POST /api/ai/projects/:projectId/bottlenecks', () => {
    it('should return 200 with dependency bottleneck graph analysis', async () => {
      const mockResult = {
        projectId: projectUuid,
        totalTasks: 8,
        dependencyCount: 6,
        dependencyPressure: 'MEDIUM',
        hasCycles: false,
        longestDependencyChain: ['Task 1', 'Task 2', 'Task 3'],
        bottlenecks: [],
        cascadingBlockers: [],
        recommendations: ['Parallelize task work'],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'getBottleneckAnalysis')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/bottlenecks`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/simulate ──────────────────────────────

  describe('POST /api/ai/projects/:projectId/simulate', () => {
    it('should return 200 with what-if simulation response', async () => {
      const mockResult = {
        projectId: projectUuid,
        isSimulation: true,
        disclaimer: 'SIMULATION ONLY: No persistent changes made to project database.',
        scenario: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT,
        scenarioDescription: 'Move overdue tasks',
        baseline: { healthScore: 68, overdueTasks: 4 },
        simulated: { healthScore: 82, overdueTasks: 0 },
        delta: { healthScoreDelta: 14, overdueTasksDelta: -4 },
        tradeOffs: ['Reduces current sprint pressure'],
        recommendations: ['Approve scope change'],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'simulateScenario')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/simulate`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .send({ scenario: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(
        projectUuid,
        { scenario: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT },
        'Bearer sample-jwt-token',
      );
    });
  });

  // ─── POST /api/ai/projects/:projectId/brief ─────────────────────────────────

  describe('POST /api/ai/projects/:projectId/brief', () => {
    it('should return 200 with executive project brief', async () => {
      const mockResult = {
        projectId: projectUuid,
        executiveSummary: 'Project Alpha is progressing stably.',
        whatIsGoingWell: ['High sprint completion'],
        whatNeedsAttention: ['1 blocked dependency'],
        criticalBottlenecks: [],
        topDeliveryRisks: [],
        actionPlan: ['Unblock task #4'],
        metricsSnapshot: {},
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'getProjectBrief')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/brief`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/query ─────────────────────────────────

  describe('POST /api/ai/projects/:projectId/query', () => {
    it('should return 200 with safe intent-based answer', async () => {
      const mockResult = {
        projectId: projectUuid,
        query: 'What is blocking our release?',
        detectedIntent: 'BLOCKERS',
        answer: 'There are 2 cascading blockers.',
        evidence: [{ metric: 'Blocked Tasks', value: 2, source: 'tasks' }],
        suggestedQuestions: ['What are the risks?'],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'queryProject')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/query`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .send({ query: 'What is blocking our release?' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(
        projectUuid,
        { query: 'What is blocking our release?' },
        'Bearer sample-jwt-token',
      );
    });
  });

  // ─── POST /api/ai/projects/:projectId/emerging-risks ─────────────────────────

  describe('POST /api/ai/projects/:projectId/emerging-risks', () => {
    it('should return 200 with detected emerging behavioral risks', async () => {
      const mockResult = {
        projectId: projectUuid,
        totalDetected: 1,
        emergingRisks: [
          {
            id: 'ER-1',
            patternType: 'STATUS_OSCILLATION',
            title: 'Stalled Tasks',
            severity: 'HIGH',
            detectedFrom: 'telemetry',
            evidence: ['2 overdue tasks'],
            impact: 'Delays milestone',
            recommendedMitigation: 'Triage standup',
            isOfficialRisk: false,
          },
        ],
        summary: '1 emerging risk detected',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'getEmergingRisks')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/emerging-risks`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/delivery-prediction ───────────────────

  describe('POST /api/ai/projects/:projectId/delivery-prediction', () => {
    it('should return 200 with delivery trajectory and pace prediction', async () => {
      const mockResult = {
        projectId: projectUuid,
        deliveryTrajectory: 'ON_TRACK',
        confidence: 'HIGH',
        confidencePercentage: 85,
        confidenceReason: 'Active velocity measured',
        currentPaceTasksPerDay: 1.5,
        requiredPaceTasksPerDay: 1.2,
        remainingDays: 4,
        remainingTasks: 5,
        estimatedCompletionDate: new Date().toISOString(),
        summary: 'On track delivery',
        signals: ['Current velocity matches required pace'],
        recommendedIntervention: 'Maintain cadence',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'getDeliveryPrediction')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/delivery-prediction`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });

  // ─── POST /api/ai/projects/:projectId/action-plan ───────────────────────────

  describe('POST /api/ai/projects/:projectId/action-plan', () => {
    it('should return 200 with prioritized action checklist', async () => {
      const mockResult = {
        projectId: projectUuid,
        totalActions: 1,
        actions: [
          {
            priority: 'CRITICAL',
            category: 'BLOCKER',
            title: 'Unblock API',
            description: 'Fix blockers',
            targetEntity: 'API Module',
            expectedImpact: 'Restores velocity',
            evidence: ['Blocking 3 tasks'],
          },
        ],
        summary: '1 prioritized action generated',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      const spy = vi
        .spyOn(aiService, 'getActionPlan')
        .mockResolvedValue(mockResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/ai/projects/${projectUuid}/action-plan`)
        .set('Authorization', 'Bearer sample-jwt-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(projectUuid, 'Bearer sample-jwt-token');
    });
  });
});
