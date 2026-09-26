import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const projectUuid = '11111111-1111-4111-a111-111111111111';
  const invalidUuid = 'not-a-uuid';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── UUID validation ─────────────────────────────────────────────────────────

  describe('UUID validation', () => {
    it('1. getTasksReport — should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getTasksReport(invalidUuid)).rejects.toThrow(BadRequestException);
    });

    it('2. getSprintsReport — should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getSprintsReport(invalidUuid)).rejects.toThrow(BadRequestException);
    });

    it('3. getRisksReport — should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getRisksReport(invalidUuid)).rejects.toThrow(BadRequestException);
    });

    it('4. getProjectOverview — should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getProjectOverview(invalidUuid)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getTasksReport ──────────────────────────────────────────────────────────

  describe('getTasksReport', () => {
    it('5. should return task aggregation with correct byStatus counts', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000).toISOString();
      const future = new Date(now.getTime() + 86400000).toISOString();

      const mockRows = [
        { status: 'TODO', priority: 'LOW', due_date: future },
        { status: 'IN_PROGRESS', priority: 'HIGH', due_date: past },
        { status: 'DONE', priority: 'MEDIUM', due_date: past },
        { status: 'BLOCKED', priority: 'URGENT', due_date: null },
        { status: 'IN_REVIEW', priority: 'LOW', due_date: null },
      ];

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
          }),
        }),
      };

      const result = await service.getTasksReport(projectUuid);

      expect(result.projectId).toBe(projectUuid);
      expect(result.total).toBe(5);
      expect(result.byStatus.TODO).toBe(1);
      expect(result.byStatus.IN_PROGRESS).toBe(1);
      expect(result.byStatus.DONE).toBe(1);
      expect(result.byStatus.BLOCKED).toBe(1);
      expect(result.byStatus.IN_REVIEW).toBe(1);
      expect(result.overdueTasks).toBe(1);
    });

    it('6. should return zero counts for empty tasks', async () => {
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };

      const result = await service.getTasksReport(projectUuid);

      expect(result.total).toBe(0);
      expect(result.overdueTasks).toBe(0);
      expect(result.byStatus.TODO).toBe(0);
    });

    it('7. should correctly aggregate byPriority', async () => {
      const mockRows = [
        { status: 'TODO', priority: 'HIGH', due_date: null },
        { status: 'TODO', priority: 'HIGH', due_date: null },
        { status: 'IN_PROGRESS', priority: 'URGENT', due_date: null },
      ];

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
          }),
        }),
      };

      const result = await service.getTasksReport(projectUuid);
      expect(result.byPriority.HIGH).toBe(2);
      expect(result.byPriority.URGENT).toBe(1);
      expect(result.byPriority.LOW).toBe(0);
    });

    it('8. should throw BadRequestException on Supabase error', async () => {
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      };

      await expect(service.getTasksReport(projectUuid)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getSprintsReport ────────────────────────────────────────────────────────

  describe('getSprintsReport', () => {
    it('9. should return sprint aggregation with correct byStatus counts', async () => {
      const mockRows = [
        { status: 'PLANNED' },
        { status: 'ACTIVE' },
        { status: 'ACTIVE' },
        { status: 'COMPLETED' },
        { status: 'CANCELLED' },
      ];

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
          }),
        }),
      };

      const result = await service.getSprintsReport(projectUuid);

      expect(result.projectId).toBe(projectUuid);
      expect(result.total).toBe(5);
      expect(result.byStatus.PLANNED).toBe(1);
      expect(result.byStatus.ACTIVE).toBe(2);
      expect(result.byStatus.COMPLETED).toBe(1);
      expect(result.byStatus.CANCELLED).toBe(1);
    });

    it('10. should return zero counts for empty sprints', async () => {
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };

      const result = await service.getSprintsReport(projectUuid);
      expect(result.total).toBe(0);
      expect(result.byStatus.ACTIVE).toBe(0);
    });
  });

  // ─── getRisksReport ──────────────────────────────────────────────────────────

  describe('getRisksReport', () => {
    it('11. should return risk aggregation with byStatus, byProbability, and byImpact breakdown', async () => {
      const mockRows = [
        { status: 'OPEN', probability: 'HIGH', impact: 'HIGH', risk_score: 9 },
        { status: 'OPEN', probability: 'MEDIUM', impact: 'HIGH', risk_score: 6 },
        { status: 'MITIGATING', probability: 'LOW', impact: 'MEDIUM', risk_score: 4 },
        { status: 'RESOLVED', probability: 'LOW', impact: 'LOW', risk_score: 1 },
        { status: 'ACCEPTED', probability: 'MEDIUM', impact: 'MEDIUM', risk_score: 2 },
        { status: 'CLOSED', probability: 'HIGH', impact: 'LOW', risk_score: 3 },
      ];

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
          }),
        }),
      };

      const result = await service.getRisksReport(projectUuid);

      expect(result.projectId).toBe(projectUuid);
      expect(result.total).toBe(6);
      expect(result.byStatus.OPEN).toBe(2);
      expect(result.byStatus.MITIGATING).toBe(1);
      expect(result.byStatus.RESOLVED).toBe(1);
      expect(result.byStatus.ACCEPTED).toBe(1);
      expect(result.byStatus.CLOSED).toBe(1);

      // Probability breakdown
      expect(result.byProbability.LOW).toBe(2);
      expect(result.byProbability.MEDIUM).toBe(2);
      expect(result.byProbability.HIGH).toBe(2);

      // Impact breakdown
      expect(result.byImpact.LOW).toBe(2);
      expect(result.byImpact.MEDIUM).toBe(2);
      expect(result.byImpact.HIGH).toBe(2);

      expect(result.averageRiskScore).toBeCloseTo(4.17, 1);
      expect(result.highScoreRisks).toBe(2);
    });

    it('12. should handle empty risk dataset safely', async () => {
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };

      const result = await service.getRisksReport(projectUuid);
      expect(result.total).toBe(0);
      expect(result.byProbability.LOW).toBe(0);
      expect(result.byProbability.MEDIUM).toBe(0);
      expect(result.byProbability.HIGH).toBe(0);
      expect(result.byImpact.LOW).toBe(0);
      expect(result.byImpact.MEDIUM).toBe(0);
      expect(result.byImpact.HIGH).toBe(0);
      expect(result.averageRiskScore).toBe(0);
      expect(result.highScoreRisks).toBe(0);
    });
  });

  // ─── getProjectOverview ──────────────────────────────────────────────────────

  describe('getProjectOverview', () => {
    it('13. should return project information, status, complete task, sprint, and risk metrics', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000).toISOString();

      const mockProject = {
        id: projectUuid,
        name: 'Alpha Project',
        status: 'ACTIVE',
        start_date: '2026-01-01T00:00:00.000Z',
        end_date: '2026-12-31T00:00:00.000Z',
        owner_id: 'owner-uuid-1234',
      };

      const tasksRows = [
        { status: 'DONE', due_date: past },
        { status: 'IN_PROGRESS', due_date: past },
        { status: 'TODO', due_date: null },
        { status: 'IN_REVIEW', due_date: null },
        { status: 'BLOCKED', due_date: null },
      ];

      const sprintsRows = [
        { status: 'ACTIVE' },
        { status: 'COMPLETED' },
      ];

      const risksRows = [
        { status: 'OPEN', risk_score: 6 },
        { status: 'MITIGATING', risk_score: 4 },
        { status: 'RESOLVED', risk_score: 2 },
      ];

      (service as any).supabase = {
        from: vi.fn().mockImplementation((table: string) => {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                if (table === 'projects') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
                  };
                }
                const resultMap: Record<string, unknown[]> = {
                  tasks: tasksRows,
                  sprints: sprintsRows,
                  risks: risksRows,
                };
                return Promise.resolve({
                  data: resultMap[table] ?? [],
                  error: null,
                });
              }),
            }),
          };
        }),
      };

      const result = await service.getProjectOverview(projectUuid);

      // 1. project information is returned
      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe(projectUuid);
      expect(result.project?.name).toBe('Alpha Project');
      expect(result.project?.start_date).toBe('2026-01-01T00:00:00.000Z');
      expect(result.project?.end_date).toBe('2026-12-31T00:00:00.000Z');
      expect(result.project?.owner_id).toBe('owner-uuid-1234');

      // 2. project status is returned
      expect(result.project?.status).toBe('ACTIVE');

      // Task metrics: total=5, done=1, pending=2 (TODO + IN_REVIEW), inProgress=1, blocked=1
      expect(result.tasks.totalTasks).toBe(5);
      expect(result.tasks.completedTasks).toBe(1);
      // 4. pendingTasks calculation
      expect(result.tasks.pendingTasks).toBe(2);
      expect(result.tasks.inProgressTasks).toBe(1);
      // 5. blockedTasks calculation
      expect(result.tasks.blockedTasks).toBe(1);
      // 6. task completion percentage calculation: (1 / 5) * 100 = 20%
      expect(result.tasks.taskCompletionPercentage).toBe(20);

      // Sprint metrics
      expect(result.sprints.totalSprints).toBe(2);
      expect(result.sprints.activeSprints).toBe(1);
      expect(result.sprints.completedSprints).toBe(1);

      // Risk metrics
      expect(result.risks.totalRisks).toBe(3);
      expect(result.risks.openRisks).toBe(1);
      // 7. mitigating risks
      expect(result.risks.mitigatingRisks).toBe(1);
      // 8. resolved risks
      expect(result.risks.resolvedRisks).toBe(1);
    });

    it('14. should handle zero tasks by returning 0% taskCompletionPercentage and zero metrics', async () => {
      (service as any).supabase = {
        from: vi.fn().mockImplementation((table: string) => {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                if (table === 'projects') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  };
                }
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }),
      };

      const result = await service.getProjectOverview(projectUuid);

      // 3. zero tasks gives 0% completion
      expect(result.project).toBeNull();
      expect(result.tasks.totalTasks).toBe(0);
      expect(result.tasks.completedTasks).toBe(0);
      expect(result.tasks.pendingTasks).toBe(0);
      expect(result.tasks.blockedTasks).toBe(0);
      expect(result.tasks.taskCompletionPercentage).toBe(0);
      expect(result.sprints.totalSprints).toBe(0);
      expect(result.risks.totalRisks).toBe(0);
      expect(result.risks.mitigatingRisks).toBe(0);
      expect(result.risks.resolvedRisks).toBe(0);
    });
  });
});

