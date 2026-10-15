import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ProjectsService } from '../src/projects/projects.service.js';

describe('Project Service (e2e)', () => {
  let app: INestApplication;
  let projectsService: ProjectsService;

  const validUuid = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const ownerUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';

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

    projectsService = moduleFixture.get<ProjectsService>(ProjectsService);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('AIPMS Project Service');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a project on valid payload', async () => {
      const createdProject = {
        id: validUuid,
        name: 'AIPMS',
        description: 'AI-Based System',
        status: 'PLANNING',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        ownerId: ownerUuid,
        createdAt: '2026-09-25T20:00:00.000Z',
        updatedAt: '2026-09-25T20:00:00.000Z',
      };

      vi.spyOn(projectsService, 'create').mockResolvedValue(createdProject as any);

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: 'AIPMS',
          description: 'AI-Based System',
          status: 'PLANNING',
          startDate: '2026-09-25T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          ownerId: ownerUuid,
        })
        .expect(201);

      expect(response.body).toEqual(createdProject);
    });

    it('should return 400 Bad Request on invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          name: '',
          status: 'INVALID_STATUS',
          ownerId: 'not-a-uuid',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should return project list with pagination meta', async () => {
      const paginatedResult = {
        data: [
          {
            id: validUuid,
            name: 'AIPMS',
            status: 'PLANNING',
            ownerId: ownerUuid,
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(projectsService, 'findAll').mockResolvedValue(paginatedResult as any);

      const response = await request(app.getHttpServer())
        .get('/api/projects?page=1&limit=20')
        .expect(200);

      expect(response.body).toEqual(paginatedResult);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by valid ID', async () => {
      const project = {
        id: validUuid,
        name: 'AIPMS',
        ownerId: ownerUuid,
      };

      vi.spyOn(projectsService, 'findOne').mockResolvedValue(project as any);

      const response = await request(app.getHttpServer())
        .get(`/api/projects/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(project);
    });

    it('should return 400 Bad Request on invalid UUID parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects/not-a-valid-uuid')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update project on valid payload', async () => {
      const updatedProject = {
        id: validUuid,
        name: 'AIPMS Phase 2',
        status: 'ACTIVE',
      };

      vi.spyOn(projectsService, 'update').mockResolvedValue(updatedProject as any);

      const response = await request(app.getHttpServer())
        .patch(`/api/projects/${validUuid}`)
        .send({
          name: 'AIPMS Phase 2',
          status: 'ACTIVE',
        })
        .expect(200);

      expect(response.body).toEqual(updatedProject);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should archive project on DELETE', async () => {
      const archivedProject = {
        id: validUuid,
        status: 'ARCHIVED',
      };

      vi.spyOn(projectsService, 'archive').mockResolvedValue(archivedProject as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${validUuid}`)
        .expect(200);

      expect(response.body).toEqual(archivedProject);
    });
  });
});
