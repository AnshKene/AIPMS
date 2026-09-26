import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ReportsService } from '../src/reports/reports.service.js';

describe('Reporting Service (e2e)', () => {
  let app: INestApplication;
  let reportsService: ReportsService;

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

    reportsService = moduleFixture.get<ReportsService>(ReportsService);

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
      expect(response.body.service).toBe('AIPMS Reporting Service');
    });
  });

  // ─── GET /api/reports/projects/:projectId/overview ───────────────────────────

  describe('GET /api/reports/projects/:projectId/overview', () => {
    it('should return 200 with project overview report', async () => {
      const overview = {
        projectId: projectUuid,
        project: {
          id: projectUuid,
          name: 'Project Alpha',
          status: 'ACTIVE',
          start_date: '2026-01-01T00:00:00.000Z',
          end_date: '2026-12-31T00:00:00.000Z',
          owner_id: 'owner-123',
        },
        tasks: {
          totalTasks: 5,
          completedTasks: 2,
          pendingTasks: 2,
          inProgressTasks: 1,
          blockedTasks: 0,
          taskCompletionPercentage: 40,
          overdue: 1,
        },
        sprints: {
          totalSprints: 3,
          activeSprints: 1,
          completedSprints: 2,
        },
        risks: {
          totalRisks: 4,
          openRisks: 2,
          mitigatingRisks: 1,
          resolvedRisks: 1,
          averageScore: 5.5,
        },
      };

      vi.spyOn(reportsService, 'getProjectOverview').mockResolvedValue(overview as any);

      const response = await request(app.getHttpServer())
        .get(`/api/reports/projects/${projectUuid}/overview`)
        .expect(200);

      expect(response.body).toEqual(overview);
    });

    it('should return 400 Bad Request on invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/projects/not-a-uuid/overview')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── GET /api/reports/projects/:projectId/tasks ───────────────────────────────

  describe('GET /api/reports/projects/:projectId/tasks', () => {
    it('should return 200 with tasks report', async () => {
      const tasksReport = {
        projectId: projectUuid,
        total: 10,
        byStatus: {
          TODO: 3,
          IN_PROGRESS: 2,
          IN_REVIEW: 1,
          DONE: 3,
          BLOCKED: 1,
        },
        byPriority: {
          LOW: 2,
          MEDIUM: 4,
          HIGH: 3,
          URGENT: 1,
        },
        overdueTasks: 2,
      };

      vi.spyOn(reportsService, 'getTasksReport').mockResolvedValue(tasksReport as any);

      const response = await request(app.getHttpServer())
        .get(`/api/reports/projects/${projectUuid}/tasks`)
        .expect(200);

      expect(response.body).toEqual(tasksReport);
      expect(response.body.overdueTasks).toBe(2);
    });

    it('should return 400 Bad Request on invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/projects/bad-id/tasks')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── GET /api/reports/projects/:projectId/sprints ────────────────────────────

  describe('GET /api/reports/projects/:projectId/sprints', () => {
    it('should return 200 with sprints report', async () => {
      const sprintsReport = {
        projectId: projectUuid,
        total: 4,
        byStatus: {
          PLANNED: 1,
          ACTIVE: 1,
          COMPLETED: 2,
          CANCELLED: 0,
        },
      };

      vi.spyOn(reportsService, 'getSprintsReport').mockResolvedValue(sprintsReport as any);

      const response = await request(app.getHttpServer())
        .get(`/api/reports/projects/${projectUuid}/sprints`)
        .expect(200);

      expect(response.body).toEqual(sprintsReport);
    });

    it('should return 400 Bad Request on invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/projects/bad-id/sprints')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── GET /api/reports/projects/:projectId/risks ───────────────────────────────

  describe('GET /api/reports/projects/:projectId/risks', () => {
    it('should return 200 with risks report including probability and impact breakdown', async () => {
      const risksReport = {
        projectId: projectUuid,
        total: 6,
        byStatus: {
          OPEN: 2,
          MITIGATING: 1,
          RESOLVED: 1,
          ACCEPTED: 1,
          CLOSED: 1,
        },
        byProbability: {
          LOW: 2,
          MEDIUM: 2,
          HIGH: 2,
        },
        byImpact: {
          LOW: 2,
          MEDIUM: 2,
          HIGH: 2,
        },
        averageRiskScore: 4.17,
        highScoreRisks: 2,
      };

      vi.spyOn(reportsService, 'getRisksReport').mockResolvedValue(risksReport as any);

      const response = await request(app.getHttpServer())
        .get(`/api/reports/projects/${projectUuid}/risks`)
        .expect(200);

      expect(response.body).toEqual(risksReport);
      expect(response.body.highScoreRisks).toBe(2);
    });

    it('should return 400 Bad Request on invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/reports/projects/bad-id/risks')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });
});
