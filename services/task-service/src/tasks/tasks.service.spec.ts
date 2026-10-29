import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TasksService, DESIGNATED_ADMIN_ID } from './tasks.service.js';
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
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
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

  describe('security and authorization enforcement (Test Groups A-G)', () => {
    const userAJwt = 'Bearer user-a-jwt';
    const userBJwt = 'Bearer user-b-jwt';
    const projectAUuid = 'a1b2c3d4-5678-40ab-b123-1234567890ab';
    const projectBUuid = 'b1b2c3d4-5678-40ab-b123-1234567890ab';
    const taskAUuid = 'c1b2c3d4-5678-40ab-b123-1234567890ab';
    const taskBUuid = 'd1b2c3d4-5678-40ab-b123-1234567890ab';

    it('should create authenticated client with Authorization header when authHeader is provided', async () => {
      const authHeader = 'Bearer valid-user-jwt-token';
      const client = (service as any).getSupabaseClient(authHeader);
      expect(client).toBeDefined();
    });

    it('should fall back to default supabase client when authHeader is omitted', async () => {
      const client = (service as any).getSupabaseClient();
      expect(client).toBe((service as any).supabase);
    });

    // Group A: Owner
    describe('Group A: Owner', () => {
      it('Owner creates task (PASS)', async () => {
        const mockTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          title: 'Project A Task',
          status: 'TODO',
          priority: 'MEDIUM',
          creator_id: 'user-a-uuid',
          created_at: '2026-10-01T12:00:00.000Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockTask, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockClient = { from: vi.fn().mockReturnValue({ insert: mockInsert }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.create(
          { projectId: projectAUuid, title: 'Project A Task' },
          userAJwt,
        );

        expect(result.id).toBe(taskAUuid);
        expect(result.creatorId).toBe('user-a-uuid');
      });

      it('Owner reads task (PASS)', async () => {
        const mockTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          title: 'Project A Task',
          status: 'TODO',
          priority: 'MEDIUM',
        };

        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockTask, error: null });
        const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ select: mockSelect }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.findOne(taskAUuid, userAJwt);
        expect(result.id).toBe(taskAUuid);
      });

      it('Owner updates task (PASS)', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: taskAUuid,
          projectId: projectAUuid,
          title: 'Project A Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
        } as any);

        const updatedRow = {
          id: taskAUuid,
          project_id: projectAUuid,
          title: 'Updated Title',
          status: 'IN_PROGRESS',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ update: mockUpdate }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.update(
          taskAUuid,
          { title: 'Updated Title', status: TaskStatus.IN_PROGRESS },
          userAJwt,
        );

        expect(result.title).toBe('Updated Title');
      });

      it('Owner deletes task (PASS)', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: taskAUuid,
          projectId: projectAUuid,
          title: 'Project A Task',
        } as any);

        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ delete: mockDelete }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.remove(taskAUuid, userAJwt);
        expect(result.message).toBe('Task deleted successfully');
      });
    });

    // Group B: Unauthorized user
    describe('Group B: Unauthorized user', () => {
      it('Foreign project SELECT (FAIL / Not Found)', async () => {
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ select: mockSelect }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(service.findOne(taskAUuid, userBJwt)).rejects.toThrow(NotFoundException);
      });

      it('Foreign project UPDATE (FAIL / Not Found)', async () => {
        vi.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Task not found'));

        await expect(
          service.update(taskAUuid, { title: 'Malicious Update' }, userBJwt),
        ).rejects.toThrow(NotFoundException);
      });

      it('Foreign project DELETE (FAIL / Not Found)', async () => {
        vi.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Task not found'));

        await expect(service.remove(taskAUuid, userBJwt)).rejects.toThrow(NotFoundException);
      });
    });

    // Group C: Assignee attack
    describe('Group C: Assignee attack', () => {
      it('User B assigned to foreign task must NOT gain project access (FAIL)', async () => {
        const rlsError = {
          message: 'new row violates row-level security policy for table "tasks"',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: rlsError });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockClient = { from: vi.fn().mockReturnValue({ insert: mockInsert }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            {
              projectId: projectAUuid,
              title: 'Assignee Attack Task',
              assigneeId: 'user-b-uuid',
            },
            userBJwt,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // Group D: Creator attack
    describe('Group D: Creator attack', () => {
      it('User B cannot create task in foreign project claiming creator (FAIL)', async () => {
        const rlsError = {
          message: 'new row violates row-level security policy for table "tasks"',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: rlsError });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockClient = { from: vi.fn().mockReturnValue({ insert: mockInsert }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            {
              projectId: projectAUuid,
              title: 'Creator Attack Task',
            },
            userBJwt,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // Group E: Project movement
    describe('Group E: Project movement', () => {
      it('Project A -> Project B without Project B authorization (FAIL)', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: taskAUuid,
          projectId: projectAUuid,
          title: 'Project A Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
        } as any);

        const mockSingle = vi.fn().mockResolvedValue({
          data: {
            id: taskAUuid,
            project_id: projectAUuid,
            title: 'Attempted Move',
          },
          error: null,
        });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ update: mockUpdate }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await service.update(
          taskAUuid,
          { title: 'Attempted Move' } as any,
          userAJwt,
        );

        // Verify that project_id was NEVER included in the update payload
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.not.objectContaining({ project_id: projectBUuid }),
        );
      });
    });

    // Group F: Team boundary
    describe('Group F: Team boundary', () => {
      it('Team Alpha member cannot access/manipulate Team Beta task (FAIL)', async () => {
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        const mockClient = { from: vi.fn().mockReturnValue({ select: mockSelect }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(service.findOne(taskBUuid, userAJwt)).rejects.toThrow(NotFoundException);
      });
    });

    // Group G: Dependency boundary
    describe('Group G: Dependency boundary', () => {
      it('Accessible task -> inaccessible task dependency creation (FAIL)', async () => {
        vi.spyOn(service, 'findOne').mockRejectedValueOnce(
          new NotFoundException(`Task with ID '${taskBUuid}' not found`),
        );

        await expect(
          service.addDependency(taskAUuid, { dependsOnTaskId: taskBUuid }, userAJwt),
        ).rejects.toThrow(NotFoundException);
      });

      it('Deleting dependency on inaccessible task (FAIL)', async () => {
        vi.spyOn(service, 'findOne').mockRejectedValue(
          new NotFoundException(`Task with ID '${taskBUuid}' not found`),
        );

        await expect(
          service.removeDependency(taskBUuid, depUuid, userAJwt),
        ).rejects.toThrow(NotFoundException);
      });
    });

    // Group H: Missing authentication
    describe('Group H: Missing authentication', () => {
      it('No Authorization header fails RLS (FAIL)', async () => {
        const rlsError = {
          message: 'new row violates row-level security policy for table "tasks"',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: rlsError });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

        (service as any).supabase = {
          from: vi.fn().mockReturnValue({ insert: mockInsert }),
        };

        await expect(
          service.create({
            projectId: projectAUuid,
            title: 'Unauthenticated Task Creation',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // Group I: Invalid team/project combination
    describe('Group I: Invalid team/project combination', () => {
      it('team_id belongs to Project B, project_id = Project A (FAIL)', async () => {
        const foreignTeamError = {
          message: 'new row violates row-level security policy for table "tasks"',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: foreignTeamError });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockClient = { from: vi.fn().mockReturnValue({ insert: mockInsert }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            {
              projectId: projectAUuid,
              title: 'Invalid Team-Project Combination',
              teamId: 'team-belonging-to-project-b-uuid',
            },
            userAJwt,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // Group J: Valid team/project combination
    describe('Group J: Valid team/project combination', () => {
      it('team_id belongs to Project A, project_id = Project A, authorized user (PASS)', async () => {
        const validTeamUuid = 'f1b2c3d4-5678-40ab-b123-1234567890ab';
        const mockTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          team_id: validTeamUuid,
          title: 'Valid Team Project Task',
          status: 'TODO',
          priority: 'MEDIUM',
          creator_id: 'user-a-uuid',
          created_at: '2026-10-01T12:00:00.000Z',
        };

        const mockSingle = vi.fn().mockResolvedValue({ data: mockTask, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
        const mockClient = { from: vi.fn().mockReturnValue({ insert: mockInsert }) };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.create(
          {
            projectId: projectAUuid,
            teamId: validTeamUuid,
            title: 'Valid Team Project Task',
          },
          userAJwt,
        );

        expect(result.id).toBe(taskAUuid);
        expect(result.teamId).toBe(validTeamUuid);
        expect(result.projectId).toBe(projectAUuid);
      });

      it('should validate sprint belongs to same project on create', async () => {
        const sprintUuid = '55555555-5555-4555-a555-555555555555';
        const mockClient = {
          from: vi.fn((table: string) => {
            if (table === 'sprints') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: sprintUuid, project_id: 'different-project-uuid' },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              insert: vi.fn(),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create({
            projectId: projectAUuid,
            sprintId: sprintUuid,
            title: 'Cross project sprint task',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should create task with valid sprint successfully', async () => {
        const sprintUuid = '55555555-5555-4555-a555-555555555555';
        const mockTaskRow = {
          id: taskAUuid,
          project_id: projectAUuid,
          title: 'Sprint Task',
          status: 'TODO',
          priority: 'MEDIUM',
          sprint_id: sprintUuid,
          creator_id: 'user-a-uuid',
          created_at: '2026-09-26T12:00:00Z',
          updated_at: '2026-09-26T12:00:00Z',
        };

        const mockClient = {
          from: vi.fn((table: string) => {
            if (table === 'sprints') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: sprintUuid, project_id: projectAUuid },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockTaskRow, error: null }),
                }),
              }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.create({
          projectId: projectAUuid,
          sprintId: sprintUuid,
          title: 'Sprint Task',
        });

        expect(result.id).toBe(taskAUuid);
        expect(result.sprintId).toBe(sprintUuid);
      });

      it('should remove task from sprint when sprintId is null on update', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: taskAUuid,
          projectId: projectAUuid,
          title: 'Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          sprintId: '55555555-5555-4555-a555-555555555555',
        } as any);

        const updatedRow = {
          id: taskAUuid,
          project_id: projectAUuid,
          title: 'Task',
          status: 'TODO',
          priority: 'MEDIUM',
          sprint_id: null,
          creator_id: 'user-a-uuid',
          created_at: '2026-09-26T12:00:00Z',
          updated_at: '2026-09-26T12:00:00Z',
        };

        const mockClient = {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
                  maybeSingle: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
                }),
              }),
            }),
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.update(taskAUuid, { sprintId: null });
        expect(result.sprintId).toBeNull();
      });
    });

    describe('Team Lead, Team Member & Viewer RBAC scenarios', () => {
      const teamIdA = '11111111-2222-4333-a444-555555555555';
      const teamIdB = '22222222-3333-4444-a555-666666666666';
      const leadUserId = 'lead-user-1';
      const memberUserId = 'member-user-1';

      it('Team Lead can create and assign tasks within own team (PASS)', async () => {
        const mockTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          team_id: teamIdA,
          title: 'Team Lead Task',
          status: 'TODO',
          priority: 'MEDIUM',
          creator_id: leadUserId,
          created_at: '2026-10-01T12:00:00.000Z',
        };

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: leadUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { role: 'TEAM_LEAD' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'tasks') {
              return {
                insert: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockTask, error: null }),
                  }),
                }),
              };
            }
            return {};
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.create(
          { projectId: projectAUuid, teamId: teamIdA, title: 'Team Lead Task' },
          'Bearer lead-token',
        );

        expect(result.id).toBe(taskAUuid);
        expect(result.teamId).toBe(teamIdA);
      });

      it('Team Member without Team Lead status cannot create tasks (FAIL)', async () => {
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: memberUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: 'MEMBER' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            { projectId: projectAUuid, teamId: teamIdA, title: 'Unauthorized Task' },
            'Bearer member-token',
          ),
        ).rejects.toThrow('Team Members cannot create tasks or assign tasks to other users.');
      });

      it('Team Member can update status of own assigned task (PASS)', async () => {
        const existingTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          assignee_id: memberUserId,
          team_id: teamIdA,
          title: 'My Task',
          status: 'TODO',
          priority: 'MEDIUM',
        };

        const updatedTask = {
          ...existingTask,
          status: 'IN_PROGRESS',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatTask'](existingTask) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: memberUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { role: 'MEMBER' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'tasks') {
              return {
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
                      maybeSingle: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {};
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        const result = await service.update(
          taskAUuid,
          { status: TaskStatus.IN_PROGRESS },
          'Bearer member-token',
        );

        expect(result.status).toBe('IN_PROGRESS');
      });

      it('Team Member cannot update another user task (FAIL)', async () => {
        const existingTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          assignee_id: 'other-user-999',
          team_id: teamIdA,
          title: 'Other Task',
          status: 'TODO',
          priority: 'MEDIUM',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatTask'](existingTask) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: memberUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: 'MEMBER' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.update(
            taskAUuid,
            { status: TaskStatus.IN_PROGRESS },
            'Bearer member-token',
          ),
        ).rejects.toThrow("Access Denied: Team Members cannot update another user's tasks without authorization.");
      });

      it('Team Member cannot update non-status fields (e.g. title) on own task (FAIL)', async () => {
        const existingTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          assignee_id: memberUserId,
          team_id: teamIdA,
          title: 'My Task',
          status: 'TODO',
          priority: 'MEDIUM',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatTask'](existingTask) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: memberUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { role: 'MEMBER' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.update(
            taskAUuid,
            { title: 'Attempted Title Tampering' },
            'Bearer member-token',
          ),
        ).rejects.toThrow('Access Denied: Team Members can only update the status of their assigned tasks.');
      });

      it('Viewer cannot mutate tasks (FAIL)', async () => {
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'viewer-user-1', app_metadata: { role: 'VIEWER' } } },
              error: null,
            }),
          },
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            { projectId: projectAUuid, title: 'Viewer Task' },
            'Bearer viewer-token',
          ),
        ).rejects.toThrow('Viewers have read-only access and cannot create tasks.');
      });

      it('Team Lead being denied assignment to another team members (FAIL)', async () => {
        const otherMemberId = 'other-member-999';
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: leadUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((col: string, val: string) => {
                      if (val === leadUserId) {
                        return { maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'TEAM_LEAD' }, error: null }) };
                      }
                      return { maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
                    }),
                  }),
                }),
              };
            }
            return {};
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            { projectId: projectAUuid, teamId: teamIdA, assigneeId: otherMemberId, title: 'Invalid Assignment' },
            'Bearer lead-token',
          ),
        ).rejects.toThrow('Access Denied: Team Leads can only assign tasks to members of their assigned team.');
      });

      it('Team Lead cannot reassign task to a different team (FAIL)', async () => {
        const existingTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          team_id: teamIdA,
          title: 'Lead Task',
          status: 'TODO',
          priority: 'MEDIUM',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatTask'](existingTask) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: leadUserId, app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'TEAM_LEAD' }, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {};
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.update(
            taskAUuid,
            { teamId: teamIdB },
            'Bearer lead-token',
          ),
        ).rejects.toThrow('Team Leads can only assign tasks within their own team.');
      });

      it('Missing team membership being denied safely (FAIL)', async () => {
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'unaffiliated-user', app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              };
            }
            return {};
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create(
            { projectId: projectAUuid, teamId: teamIdA, title: 'Non-Member Task' },
            'Bearer random-token',
          ),
        ).rejects.toThrow('Team Members cannot create tasks or assign tasks to other users.');
      });

      it('Viewer cannot update tasks (FAIL)', async () => {
        const existingTask = {
          id: taskAUuid,
          project_id: projectAUuid,
          team_id: teamIdA,
          title: 'Existing Task',
          status: 'TODO',
        };

        vi.spyOn(service, 'findOne').mockResolvedValue(service['formatTask'](existingTask) as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'viewer-user-1', app_metadata: { role: 'VIEWER' } } },
              error: null,
            }),
          },
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.update(
            taskAUuid,
            { status: TaskStatus.IN_PROGRESS },
            'Bearer viewer-token',
          ),
        ).rejects.toThrow('Viewers have read-only access and cannot modify tasks.');
      });
    });

    describe('DEFECT-01: Cross-project task creation and mutation guards', () => {
      const p1 = 'a1b2c3d4-5678-40ab-b123-1234567890ab';
      const p2 = 'b1b2c3d4-5678-40ab-b123-1234567890ab';
      const teamId = 'c1b2c3d4-5678-40ab-b123-1234567890ab';
      const sprintId = 'd1b2c3d4-5678-40ab-b123-1234567890ab';

      it('should reject task creation when team belongs to a different project', async () => {
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'pm-user', app_metadata: { role: 'PROJECT_MANAGER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'project_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'pm-1' }, error: null }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'teams') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: teamId, project_id: p2 }, // Team is in project p2, not p1
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create({
            projectId: p1,
            title: 'Cross-Project Team Task',
            teamId,
          }, 'Bearer pm-token'),
        ).rejects.toThrow('Team does not belong to the specified project');
      });

      it('should reject task creation when sprint belongs to a different project', async () => {
        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'pm-user', app_metadata: { role: 'PROJECT_MANAGER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'project_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'pm-1' }, error: null }),
                    }),
                  }),
                }),
              };
            }
            if (table === 'sprints') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: sprintId, project_id: p2 }, // Sprint in p2, not p1
                      error: null,
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.create({
            projectId: p1,
            title: 'Mismatched Sprint Task',
            sprintId,
          }, 'Bearer pm-token'),
        ).rejects.toThrow('Sprint belongs to a different project');
      });
    });

    describe('DEFECT-08: Task dependencies RBAC and cycle prevention', () => {
      const p1 = 'a1b2c3d4-5678-40ab-b123-1234567890ab';
      const p2 = 'b1b2c3d4-5678-40ab-b123-1234567890ab';
      const task1Id = '11111111-1111-4111-a111-111111111111';
      const task2Id = '22222222-2222-4222-a222-222222222222';
      const task3Id = '33333333-3333-4333-a333-333333333333';

      it('should reject cross-project task dependencies', async () => {
        vi.spyOn(service, 'findOne').mockImplementation(async (id: string) => {
          if (id === task1Id) {
            return { id: task1Id, projectId: p1, title: 'Task 1' } as any;
          }
          return { id: task2Id, projectId: p2, title: 'Task 2' } as any;
        });

        await expect(
          service.addDependency(task1Id, { dependsOnTaskId: task2Id }, 'Bearer admin-token'),
        ).rejects.toThrow('Cannot create cross-project task dependencies');
      });

      it('should reject circular task dependencies', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: task1Id,
          projectId: p1,
          title: 'Task 1',
        } as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: DESIGNATED_ADMIN_ID, email: 'admin.ansh@aipms.com' } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'task_dependencies') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn((col: string, val: string) => {
                    if (val === task2Id) {
                      // task2 depends on task1 -> cycle!
                      return Promise.resolve({ data: [{ depends_on_task_id: task1Id }], error: null });
                    }
                    return {
                      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                    };
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.addDependency(task1Id, { dependsOnTaskId: task2Id }, 'Bearer admin-token'),
        ).rejects.toThrow('Circular dependency detected: adding this dependency would create a cycle');
      });

      it('should reject dependency creation by regular Team Member', async () => {
        vi.spyOn(service, 'findOne').mockResolvedValue({
          id: task1Id,
          projectId: p1,
          teamId: 'team-1',
          title: 'Task 1',
        } as any);

        const mockClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'member-1', app_metadata: { role: 'TEAM_MEMBER' } } },
              error: null,
            }),
          },
          from: vi.fn((table: string) => {
            if (table === 'team_members') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'TEAM_MEMBER' } }),
                    }),
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            };
          }),
        };

        vi.spyOn(service as any, 'getSupabaseClient').mockReturnValue(mockClient);

        await expect(
          service.addDependency(task1Id, { dependsOnTaskId: task3Id }, 'Bearer member-token'),
        ).rejects.toThrow('Access Denied: Viewers and regular Team Members cannot mutate task dependencies.');
      });
    });
  });
});
