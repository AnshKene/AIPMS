import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TasksService } from './tasks.service.js';
import { TaskStatus } from './enums/task-status.enum.js';
import { TaskPriority } from './enums/task-priority.enum.js';

describe('TasksService', () => {
  let service: TasksService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const validUuid1 = 'd0a1b2c3-4567-49ab-a123-0123456789ab';
  const validUuid2 = 'e0a1b2c3-4567-49ab-a123-0123456789ab';
  const projectUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';
  const depUuid = 'f0a1b2c3-4567-49ab-a123-0123456789ab';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task successfully', async () => {
      const mockTask = {
        id: validUuid1,
        project_id: projectUuid,
        title: 'Implement login UI',
        description: 'Build front-end login form',
        status: 'TODO',
        priority: 'MEDIUM',
        assignee_id: null,
        team_id: null,
        start_date: '2026-09-26T00:00:00.000Z',
        due_date: '2026-10-15T00:00:00.000Z',
        created_at: '2026-09-26T12:00:00.000Z',
        updated_at: '2026-09-26T12:00:00.000Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const result = await service.create({
        projectId: projectUuid,
        title: 'Implement login UI',
        description: 'Build front-end login form',
        startDate: '2026-09-26T00:00:00.000Z',
        dueDate: '2026-10-15T00:00:00.000Z',
      });

      expect(result.id).toBe(validUuid1);
      expect(result.title).toBe('Implement login UI');
      expect(result.projectId).toBe(projectUuid);
      expect(result.status).toBe('TODO');
      expect(result.priority).toBe('MEDIUM');
    });

    it('should throw BadRequestException when due date is earlier than start date', async () => {
      await expect(
        service.create({
          projectId: projectUuid,
          title: 'Invalid Date Task',
          startDate: '2026-10-15T00:00:00.000Z',
          dueDate: '2026-09-26T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of tasks', async () => {
      const mockTasks = [
        {
          id: validUuid1,
          project_id: projectUuid,
          title: 'Task 1',
          status: 'TODO',
          priority: 'HIGH',
          created_at: '2026-09-26T12:00:00.000Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTasks,
        count: 1,
        error: null,
      });
      const mockRange = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ range: mockRange });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a task by valid ID', async () => {
      const mockTask = {
        id: validUuid1,
        project_id: projectUuid,
        title: 'Task 1',
        status: 'TODO',
        priority: 'MEDIUM',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findOne(validUuid1);
      expect(result.id).toBe(validUuid1);
    });

    it('should throw BadRequestException on invalid UUID format', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when task is not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(service.findOne(validUuid1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const existingTask = {
        id: validUuid1,
        projectId: projectUuid,
        title: 'Task 1',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        startDate: null,
        dueDate: null,
      };

      const updatedTaskRow = {
        id: validUuid1,
        project_id: projectUuid,
        title: 'Task 1 Updated',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(existingTask as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedTaskRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.update(validUuid1, {
        title: 'Task 1 Updated',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      });

      expect(result.title).toBe('Task 1 Updated');
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.priority).toBe('HIGH');
    });
  });

  describe('remove', () => {
    it('should remove a task successfully', async () => {
      const existingTask = {
        id: validUuid1,
        projectId: projectUuid,
        title: 'Task 1',
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(existingTask as any);

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      };

      const result = await service.remove(validUuid1);
      expect(result.message).toBe('Task deleted successfully');
      expect(result.id).toBe(validUuid1);
    });
  });

  describe('addDependency', () => {
    it('should throw BadRequestException if task depends on itself', async () => {
      await expect(
        service.addDependency(validUuid1, { dependsOnTaskId: validUuid1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add dependency successfully when both tasks exist and relationship does not exist', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({ id: 'dummy' } as any);

      const mockDepRow = {
        id: depUuid,
        task_id: validUuid1,
        depends_on_task_id: validUuid2,
        created_at: '2026-09-26T12:00:00.000Z',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      const mockSingleInsert = vi.fn().mockResolvedValue({ data: mockDepRow, error: null });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

      (service as any).supabase = {
        from: vi.fn((table: string) => {
          if (table === 'task_dependencies') {
            return {
              select: mockSelectCheck,
              insert: mockInsert,
            };
          }
          return {};
        }),
      };

      const result = await service.addDependency(validUuid1, {
        dependsOnTaskId: validUuid2,
      });

      expect(result.id).toBe(depUuid);
      expect(result.taskId).toBe(validUuid1);
      expect(result.dependsOnTaskId).toBe(validUuid2);
    });

    it('should throw ConflictException if dependency relationship already exists', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({ id: 'dummy' } as any);

      const mockExistingDep = {
        id: depUuid,
        task_id: validUuid1,
        depends_on_task_id: validUuid2,
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockExistingDep, error: null });
      const mockSelectCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelectCheck }),
      };

      await expect(
        service.addDependency(validUuid1, { dependsOnTaskId: validUuid2 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeDependency', () => {
    it('should remove dependency successfully', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({ id: validUuid1 } as any);

      const mockSelectDelete = vi.fn().mockResolvedValue({
        data: [{ id: depUuid, task_id: validUuid1 }],
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ select: mockSelectDelete });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      };

      const result = await service.removeDependency(validUuid1, depUuid);
      expect(result.message).toBe('Dependency removed successfully');
      expect(result.dependencyId).toBe(depUuid);
    });

    it('should throw NotFoundException if relationship does not exist', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({ id: validUuid1 } as any);

      const mockSelectDelete = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ select: mockSelectDelete });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      };

      await expect(
        service.removeDependency(validUuid1, depUuid),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
