import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service.js';
import { OllamaService } from './ollama.service.js';
import { SimulationScenarioType } from './dto/ai-request.dto.js';

describe('AiService', () => {
  let service: AiService;
  let mockConfigService: Partial<ConfigService>;
  let mockOllamaService: Partial<OllamaService>;

  const validProjectId = '11111111-1111-4111-a111-111111111111';
  const invalidProjectId = 'invalid-uuid-123';
  const validAuthHeader = 'Bearer sample-user-jwt';

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'supabase.url') return 'https://test.supabase.co';
        if (key === 'supabase.anonKey') return 'test-anon-key';
        return undefined;
      }),
    };

    mockOllamaService = {
      generateStructuredAnalysis: vi.fn(async (_system, _context, fallbackGen) => {
        const fb = fallbackGen();
        return {
          summary: fb.summary,
          insights: fb.insights,
          recommendations: fb.recommendations,
          generatedBy: 'deterministic-fallback' as const,
        };
      }),
      generateSimulationSynthesis: vi.fn(async (_desc, _context, fallbackGen) => {
        const fb = fallbackGen();
        return {
          tradeOffs: fb.tradeOffs,
          recommendations: fb.recommendations,
          generatedBy: 'deterministic-fallback' as const,
        };
      }),
      generateProjectBrief: vi.fn(async (_context, fallbackGen) => {
        const fb = fallbackGen();
        return {
          executiveSummary: fb.executiveSummary,
          whatIsGoingWell: fb.whatIsGoingWell,
          whatNeedsAttention: fb.whatNeedsAttention,
          criticalBottlenecks: fb.criticalBottlenecks,
          topDeliveryRisks: fb.topDeliveryRisks,
          actionPlan: fb.actionPlan,
          generatedBy: 'deterministic-fallback' as const,
        };
      }),
      generateQueryAnswer: vi.fn(async (_q, _i, _facts, fallbackGen) => {
        const fb = fallbackGen();
        return {
          answer: fb.answer,
          suggestedQuestions: fb.suggestedQuestions,
          generatedBy: 'deterministic-fallback' as const,
        };
      }),
    };

    service = new AiService(
      mockConfigService as ConfigService,
      mockOllamaService as OllamaService,
    );
  });

  describe('Authorization & UUID Validation', () => {
    it('should throw UnauthorizedException when Authorization header is missing', async () => {
      await expect(service.getHealthSummary(validProjectId, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException on invalid UUID across all endpoints', async () => {
      await expect(
        service.getHealthSummary(invalidProjectId, validAuthHeader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getRiskMitigation(invalidProjectId, validAuthHeader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getWorkloadBalance(invalidProjectId, validAuthHeader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getBottleneckAnalysis(invalidProjectId, validAuthHeader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.simulateScenario(
          invalidProjectId,
          { scenario: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT },
          validAuthHeader,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getProjectBrief(invalidProjectId, validAuthHeader),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.queryProject(
          invalidProjectId,
          { query: 'what is blocking us?' },
          validAuthHeader,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Project Accessibility (404 Not Found)', () => {
    it('should throw NotFoundException if project is not accessible under caller RLS', async () => {
      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      await expect(
        service.getHealthSummary(validProjectId, validAuthHeader),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Health Summary & Quantitative Scoring', () => {
    it('should aggregate project data and compute quantitative health score & signals', async () => {
      const mockProject = { id: validProjectId, name: 'Core Engine', status: 'ACTIVE' };
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'DONE', priority: 'HIGH', due_date: '2026-10-01' },
        { id: '2', title: 'Task 2', status: 'IN_PROGRESS', priority: 'MEDIUM', due_date: '2026-10-10' },
        { id: '3', title: 'Task 3', status: 'BLOCKED', priority: 'HIGH', due_date: '2026-09-01' },
      ];
      const mockSprints = [{ id: 's1', name: 'Sprint 1', status: 'ACTIVE', end_date: '2026-10-15' }];
      const mockRisks = [
        {
          id: 'r1',
          title: 'DB Migration',
          probability: 4,
          impact: 4,
          risk_score: 16,
          status: 'OPEN',
          mitigation_plan: 'Backup DB',
        },
      ];

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(
            table === 'projects' ? { data: mockProject, error: null } : { data: null, error: null },
          ),
          then: (resolve: (v: any) => void) => {
            if (table === 'tasks') resolve({ data: mockTasks, error: null });
            else if (table === 'sprints') resolve({ data: mockSprints, error: null });
            else if (table === 'risks') resolve({ data: mockRisks, error: null });
            else if (table === 'task_dependencies') resolve({ data: [], error: null });
            else resolve({ data: [], error: null });
          },
        })),
      });

      const res = await service.getHealthSummary(validProjectId, validAuthHeader);
      expect(res.projectId).toBe(validProjectId);
      expect(res.projectName).toBe('Core Engine');
      expect(typeof res.healthScore).toBe('number');
      expect(res.healthScore).toBeLessThan(100);
      expect(res.signals?.length).toBeGreaterThan(0);
      expect(res.riskDeliveryImpact?.length).toBe(1);
    });
  });

  describe('Bottleneck & Graph Analysis', () => {
    it('should compute dependency graph fan-out and identify cascading blockers', async () => {
      const mockProject = { id: validProjectId, name: 'Core Engine' };
      const mockTasks = [
        { id: 't1', title: 'Task 1 (DB Schema)', status: 'BLOCKED', priority: 'HIGH' },
        { id: 't2', title: 'Task 2 (API Gateway)', status: 'TODO', priority: 'MEDIUM' },
        { id: 't3', title: 'Task 3 (Frontend UI)', status: 'TODO', priority: 'LOW' },
      ];
      const mockDeps = [
        { id: 'd1', task_id: 't2', depends_on_task_id: 't1' },
        { id: 'd2', task_id: 't3', depends_on_task_id: 't2' },
      ];

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(
            table === 'projects' ? { data: mockProject, error: null } : { data: null, error: null },
          ),
          then: (resolve: (v: any) => void) => {
            if (table === 'tasks') resolve({ data: mockTasks, error: null });
            else if (table === 'task_dependencies') resolve({ data: mockDeps, error: null });
            else resolve({ data: [], error: null });
          },
        })),
      });

      const res = await service.getBottleneckAnalysis(validProjectId, validAuthHeader);
      expect(res.totalTasks).toBe(3);
      expect(res.dependencyCount).toBe(2);
      expect(res.longestDependencyChain.length).toBe(3);
      expect(res.cascadingBlockers.length).toBeGreaterThan(0);
      expect(res.cascadingBlockers[0].blockerTaskId).toBe('t1');
    });
  });

  describe('What-If Project Simulator', () => {
    it('should calculate baseline vs simulated hypothetical state without persisting data', async () => {
      const mockProject = { id: validProjectId, name: 'Core Engine' };
      const mockTasks = [
        { id: 't1', title: 'Overdue Task', status: 'IN_PROGRESS', priority: 'HIGH', due_date: '2026-09-01' },
        { id: 't2', title: 'Normal Task', status: 'DONE', priority: 'MEDIUM', due_date: '2026-10-10' },
      ];
      const mockRisks = [
        { id: 'r1', title: 'Critical Risk', risk_score: 16, status: 'OPEN' },
      ];

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
          then: (resolve: (v: any) => void) => {
            if (table === 'tasks') resolve({ data: mockTasks, error: null });
            else if (table === 'risks') resolve({ data: mockRisks, error: null });
            else if (table === 'sprints') resolve({ data: [], error: null });
            else resolve({ data: [], error: null });
          },
        })),
      });

      const res = await service.simulateScenario(
        validProjectId,
        { scenario: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT },
        validAuthHeader,
      );

      expect(res.isSimulation).toBe(true);
      expect(res.baseline.overdueTasks).toBe(1);
      expect(res.simulated.overdueTasks).toBe(0);
      expect(res.delta.healthScoreDelta).toBeGreaterThanOrEqual(0);
      expect(res.tradeOffs.length).toBeGreaterThan(0);
    });
  });

  describe('Executive Project Brief', () => {
    it('should compile an executive-friendly multi-module project brief', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        healthScore: 78,
        healthStatus: 'MODERATE_RISK',
        deliveryTrajectory: 'ON_TRACK',
        summary: 'Healthy status',
        insights: [],
        recommendations: ['Maintain pace'],
        metrics: { completedTasks: 5, totalTasks: 10, overdueTasks: 1, blockedTasks: 0 },
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);
      vi.spyOn(service, 'getBottleneckAnalysis').mockResolvedValue({
        projectId: validProjectId,
        totalTasks: 10,
        dependencyCount: 2,
        dependencyPressure: 'LOW',
        hasCycles: false,
        longestDependencyChain: [],
        bottlenecks: [],
        cascadingBlockers: [],
        recommendations: [],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      });

      const brief = await service.getProjectBrief(validProjectId, validAuthHeader);
      expect(brief.projectId).toBe(validProjectId);
      expect(brief.executiveSummary).toContain('Core Engine');
      expect(brief.whatIsGoingWell.length).toBeGreaterThan(0);
      expect(brief.whatNeedsAttention.length).toBeGreaterThan(0);
    });
  });

  describe('Safe Natural Language Query', () => {
    it('should detect intent safely and provide evidence-backed answer', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        healthScore: 78,
        healthStatus: 'MODERATE_RISK',
        deliveryTrajectory: 'ON_TRACK',
        recommendations: ['Review overdue tasks'],
        metrics: { completedTasks: 5, totalTasks: 10, overdueTasks: 1, blockedTasks: 1 },
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);
      vi.spyOn(service, 'getBottleneckAnalysis').mockResolvedValue({
        projectId: validProjectId,
        totalTasks: 10,
        dependencyCount: 2,
        dependencyPressure: 'LOW',
        hasCycles: false,
        longestDependencyChain: [],
        bottlenecks: [],
        cascadingBlockers: [{ blockerTaskId: 't1', blockerTitle: 'Task 1', blockedTasksCount: 2, blockedTaskTitles: [], sprintImpact: '' }],
        recommendations: [],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      });

      const queryRes = await service.queryProject(
        validProjectId,
        { query: 'What dependency bottlenecks are blocking our progress?' },
        validAuthHeader,
      );

      expect(queryRes.detectedIntent).toBe('BLOCKERS');
      expect(queryRes.evidence.length).toBeGreaterThan(0);
      expect(queryRes.suggestedQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('Emerging Behavioral Risks', () => {
    it('should identify unmanaged emerging behavioral risk patterns from telemetry', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        healthScore: 65,
        healthStatus: 'AT_RISK',
        deliveryTrajectory: 'BEHIND_SCHEDULE',
        workloadPressure: 'HIGH',
        metrics: { inProgressTasks: 4, overdueTasks: 2, sprintVelocityPace: 0.5, requiredPace: 1.5 },
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);
      vi.spyOn(service, 'getBottleneckAnalysis').mockResolvedValue({
        projectId: validProjectId,
        totalTasks: 10,
        dependencyCount: 2,
        dependencyPressure: 'HIGH',
        hasCycles: false,
        longestDependencyChain: ['1', '2', '3'],
        bottlenecks: [],
        cascadingBlockers: [
          { blockerTaskId: 'b1', blockerTitle: 'Auth Service', blockedTasksCount: 3, blockedTaskTitles: ['Task 2', 'Task 3'], sprintImpact: 'High' },
        ],
        recommendations: [],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      });

      const res = await service.getEmergingRisks(validProjectId, validAuthHeader);
      expect(res.projectId).toBe(validProjectId);
      expect(res.totalDetected).toBeGreaterThan(0);
      expect(res.emergingRisks.some((r) => r.patternType === 'STATUS_OSCILLATION')).toBe(true);
      expect(res.emergingRisks.some((r) => r.patternType === 'WORKLOAD_CONCENTRATION')).toBe(true);
      expect(res.emergingRisks.some((r) => r.patternType === 'DEPENDENCY_BOTTLENECK')).toBe(true);
    });
  });

  describe('Delivery Prediction & Velocity Cadence', () => {
    it('should compute delivery trajectory, pace ratios, and confidence percentage', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        deliveryTrajectory: 'BEHIND_SCHEDULE',
        metrics: {
          daysRemainingInSprint: 4,
          inProgressTasks: 3,
          overdueTasks: 2,
          sprintVelocityPace: 0.5,
          requiredPace: 1.25,
          blockedTasks: 1,
        },
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);

      const res = await service.getDeliveryPrediction(validProjectId, validAuthHeader);
      expect(res.projectId).toBe(validProjectId);
      expect(res.deliveryTrajectory).toBe('BEHIND_SCHEDULE');
      expect(res.confidence).toBe('HIGH');
      expect(res.confidencePercentage).toBe(85);
      expect(res.remainingTasks).toBe(5);
      expect(res.signals.length).toBeGreaterThan(0);
    });
  });

  describe('Prioritized Action Plan', () => {
    it('should prioritize critical blockers, top risks, and overdue triage', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        healthScore: 60,
        riskDeliveryImpact: [
          {
            riskId: 'r1',
            riskTitle: 'Database Deadlock Risk',
            riskScore: 20,
            deliveryImpact: 'CRITICAL',
            affectedTasksCount: 3,
            isAffectingActiveSprint: true,
            mitigationPlan: 'Apply connection pool indexing',
          },
        ],
        metrics: { overdueTasks: 3, inProgressTasks: 2 },
        workloadPressure: 'HIGH',
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);
      vi.spyOn(service, 'getBottleneckAnalysis').mockResolvedValue({
        projectId: validProjectId,
        totalTasks: 10,
        dependencyCount: 2,
        dependencyPressure: 'HIGH',
        hasCycles: false,
        longestDependencyChain: ['1', '2'],
        bottlenecks: [],
        cascadingBlockers: [
          { blockerTaskId: 'b1', blockerTitle: 'User Auth Module', blockedTasksCount: 2, blockedTaskTitles: ['Task 2'], sprintImpact: 'High' },
        ],
        recommendations: [],
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      });

      const res = await service.getActionPlan(validProjectId, validAuthHeader);
      expect(res.projectId).toBe(validProjectId);
      expect(res.totalActions).toBeGreaterThanOrEqual(3);
      expect(res.actions.some((a) => a.category === 'BLOCKER')).toBe(true);
      expect(res.actions.some((a) => a.category === 'RISK')).toBe(true);
      expect(res.actions.some((a) => a.category === 'SCHEDULE')).toBe(true);
    });
  });

  describe('Insufficient Telemetry & Data Sufficiency', () => {
    it('should return INSUFFICIENT_DATA and expose limited data sufficiency on sparse project', async () => {
      const mockProject = { id: validProjectId, name: 'Sparse Project', status: 'ACTIVE' };
      const mockTasks = [{ id: '1', title: 'Single lonely task', status: 'TODO', priority: 'LOW' }];

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(
            table === 'projects' ? { data: mockProject, error: null } : { data: null, error: null },
          ),
          then: (resolve: (v: any) => void) => {
            if (table === 'tasks') resolve({ data: mockTasks, error: null });
            else if (table === 'sprints') resolve({ data: [], error: null });
            else if (table === 'risks') resolve({ data: [], error: null });
            else if (table === 'task_dependencies') resolve({ data: [], error: null });
            else resolve({ data: [], error: null });
          },
        })),
      });

      const res = await service.getHealthSummary(validProjectId, validAuthHeader);
      expect(res.deliveryTrajectory).toBe('INSUFFICIENT_DATA');
      expect(res.dataSufficiency).toBeDefined();
      expect(res.dataSufficiency?.sufficient).toBe(false);
      expect(['MINIMAL', 'LOW']).toContain(res.dataSufficiency?.level);
      expect(res.signals?.some((s) => s.title === 'Limited Project Telemetry')).toBe(true);
      expect(res.summary).toContain('telemetry');
    });

    it('should return preventive guidance when zero risks are recorded', async () => {
      const mockProject = { id: validProjectId, name: 'Zero Risk Project' };

      (service as any).getSupabaseClient = vi.fn().mockReturnValue({
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue(
            table === 'projects' ? { data: mockProject, error: null } : { data: null, error: null },
          ),
          then: (resolve: (v: any) => void) => {
            if (table === 'risks') resolve({ data: [], error: null });
            else if (table === 'tasks') resolve({ data: [], error: null });
            else resolve({ data: [], error: null });
          },
        })),
      });

      const res = await service.getRiskMitigation(validProjectId, validAuthHeader);
      expect(res.projectId).toBe(validProjectId);
      expect(res.summary).toContain('No high-severity risks are currently recorded');
      expect(res.recommendations.some((r) => r.includes('[Preventive Guidance]'))).toBe(true);
      expect(res.risks?.length).toBe(0);
    });

    it('should answer unsupported questions with clear telemetry disclaimer', async () => {
      const mockHealth = {
        projectId: validProjectId,
        projectName: 'Core Engine',
        healthScore: 80,
        healthStatus: 'HEALTHY',
        deliveryTrajectory: 'ON_TRACK',
        recommendations: ['Maintain pace'],
        metrics: { totalTasks: 5, blockedTasks: 0, overdueTasks: 0, unresolvedRisksCount: 0 },
        generatedBy: 'deterministic-fallback',
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(service, 'getHealthSummary').mockResolvedValue(mockHealth as any);

      const queryRes = await service.queryProject(
        validProjectId,
        { query: 'How do I bake sourdough bread?' },
        validAuthHeader,
      );

      expect(queryRes.detectedIntent).toBe('UNSUPPORTED');
      expect(queryRes.answer).toContain('Insufficient project evidence');
    });
  });
});
