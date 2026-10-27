import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { TasksService } from '../src/tasks/tasks.service.js';

describe('Task Service (e2e)', () => {
  let app: INestApplication;
  let tasksService: TasksService;

  const validUuid1 = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const validUuid2 = 'e0a1b2c3-4567-49ab-a123-0123456789ab';
  const projectUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';
  const depUuid = 'f0a1b2c3-4567-49ab-a123-0123456789ab';

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

    tasksService = moduleFixture.get<TasksService>(TasksService);

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
      expect(response.body.service).toBe('AIPMS Task Service');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a task on valid payload', async () => {
      const createdTask = {
        id: validUuid1,
        projectId: projectUuid,
        title: 'Implement task feature',
        description: 'Detailed description',
        status: 'TODO',
        priority: 'MEDIUM',
        createdAt: '2026-09-26T12:00:00.000Z',
        updatedAt: '2026-09-26T12:00:00.000Z',
      };

      vi.spyOn(tasksService, 'create').mockResolvedValue(createdTask as any);

      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          projectId: projectUuid,
          title: 'Implement task feature',
          description: 'Detailed description',
          status: 'TODO',
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(response.body).toEqual(createdTask);
    });

    it('should return 400 Bad Request on invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .send({
          title: '',
          projectId: 'not-a-uuid',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return task list with pagination meta', async () => {
      const paginatedResult = {
        data: [
          {
            id: validUuid1,
            projectId: projectUuid,
            title: 'Implement task feature',
            status: 'TODO',
            priority: 'MEDIUM',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(tasksService, 'findAll').mockResolvedValue(paginatedResult as any);

      const response = await request(app.getHttpServer())
        .get('/api/tasks?page=1&limit=20')
        .expect(200);

      expect(response.body).toEqual(paginatedResult);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by valid ID', async () => {
      const task = {
        id: validUuid1,
        projectId: projectUuid,
        title: 'Implement task feature',
      };

      vi.spyOn(tasksService, 'findOne').mockResolvedValue(task as any);

      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${validUuid1}`)
        .expect(200);

      expect(response.body).toEqual(task);
    });

    it('should return 400 Bad Request on invalid UUID parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks/not-a-valid-uuid')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task on valid payload', async () => {
      const updatedTask = {
        id: validUuid1,
        title: 'Updated Task Title',
        status: 'IN_PROGRESS',
      };

      vi.spyOn(tasksService, 'update').mockResolvedValue(updatedTask as any);

      const response = await request(app.getHttpServer())
        .patch(`/api/tasks/${validUuid1}`)
        .send({
          title: 'Updated Task Title',
          status: 'IN_PROGRESS',
        })
        .expect(200);

      expect(response.body).toEqual(updatedTask);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task on DELETE', async () => {
      const deleteResult = {
        message: 'Task deleted successfully',
        id: validUuid1,
      };

      vi.spyOn(tasksService, 'remove').mockResolvedValue(deleteResult as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/tasks/${validUuid1}`)
        .expect(200);

      expect(response.body).toEqual(deleteResult);
    });
  });

  describe('Task Dependencies Endpoints', () => {
    it('POST /api/tasks/:id/dependencies should add a dependency', async () => {
      const depResult = {
        id: depUuid,
        taskId: validUuid1,
        dependsOnTaskId: validUuid2,
        createdAt: '2026-09-26T12:00:00.000Z',
      };

      vi.spyOn(tasksService, 'addDependency').mockResolvedValue(depResult as any);

      const response = await request(app.getHttpServer())
        .post(`/api/tasks/${validUuid1}/dependencies`)
        .send({ dependsOnTaskId: validUuid2 })
        .expect(201);

      expect(response.body).toEqual(depResult);
    });

    it('POST /api/tasks/:id/dependencies should return 409 Conflict on duplicate dependency', async () => {
      const { ConflictException } = await import('@nestjs/common');
      vi.spyOn(tasksService, 'addDependency').mockRejectedValue(
        new ConflictException('Dependency relationship already exists'),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/tasks/${validUuid1}/dependencies`)
        .send({ dependsOnTaskId: validUuid2 })
        .expect(409);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toBe('Dependency relationship already exists');
    });

    it('GET /api/tasks/:id/dependencies should list dependencies', async () => {
      const listResult = {
        data: [
          {
            id: depUuid,
            taskId: validUuid1,
            dependsOnTaskId: validUuid2,
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.spyOn(tasksService, 'listDependencies').mockResolvedValue(listResult as any);

      const response = await request(app.getHttpServer())
        .get(`/api/tasks/${validUuid1}/dependencies`)
        .expect(200);

      expect(response.body).toEqual(listResult);
    });

    it('DELETE /api/tasks/:taskId/dependencies/:dependencyId should remove dependency', async () => {
      const removeResult = {
        message: 'Dependency removed successfully',
        taskId: validUuid1,
        dependencyId: depUuid,
      };

      vi.spyOn(tasksService, 'removeDependency').mockResolvedValue(removeResult as any);

      const response = await request(app.getHttpServer())
        .delete(`/api/tasks/${validUuid1}/dependencies/${depUuid}`)
        .expect(200);

      expect(response.body).toEqual(removeResult);
    });

    it('DELETE /api/tasks/:taskId/dependencies/:dependencyId should return 404 when dependency not found', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      vi.spyOn(tasksService, 'removeDependency').mockRejectedValue(
        new NotFoundException('Dependency relationship not found'),
      );

      const response = await request(app.getHttpServer())
        .delete(`/api/tasks/${validUuid1}/dependencies/${depUuid}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBe('Dependency relationship not found');
    });
  });
});
