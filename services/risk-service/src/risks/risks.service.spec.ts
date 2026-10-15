import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { RisksService } from './risks.service.js';
import { RiskProbability } from './enums/risk-probability.enum.js';
import { RiskImpact } from './enums/risk-impact.enum.js';
import { RiskStatus } from './enums/risk-status.enum.js';

describe('RisksService', () => {
  let service: RisksService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const validUuid = '11111111-1111-4111-a111-111111111111';
  const projectUuid = '22222222-2222-4222-a222-222222222222';
  const ownerUuid = '33333333-3333-4333-a333-333333333333';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RisksService>(RisksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Numeric Mappings & Risk Score Calculation (3, 4, 5, 6)
  describe('Probability & Impact Numeric Mapping & Score Calculation', () => {
    it('3. should map LOW probability to 1 and calculate score LOW x LOW = 1', () => {
      const score = service.calculateRiskScore(
        RiskProbability.LOW,
        RiskImpact.LOW,
      );
      expect(score).toBe(1);
    });

    it('4. should map MEDIUM probability to 2 and calculate score MEDIUM x HIGH = 6', () => {
      const score = service.calculateRiskScore(
        RiskProbability.MEDIUM,
        RiskImpact.HIGH,
      );
      expect(score).toBe(6);
    });

    it('5. should map HIGH probability to 3 and calculate score HIGH x HIGH = 9', () => {
      const score = service.calculateRiskScore(
        RiskProbability.HIGH,
        RiskImpact.HIGH,
      );
      expect(score).toBe(9);
    });

    it('6. should correctly calculate risk_score across all combinations (Range 1-9)', () => {
      expect(
        service.calculateRiskScore(RiskProbability.LOW, RiskImpact.MEDIUM),
      ).toBe(2);
      expect(
        service.calculateRiskScore(RiskProbability.HIGH, RiskImpact.LOW),
      ).toBe(3);
      expect(
        service.calculateRiskScore(RiskProbability.MEDIUM, RiskImpact.MEDIUM),
      ).toBe(4);
    });
  });

  // 1. Risk creation & 2. Default OPEN status
  describe('create', () => {
    it('1. & 2. should create a risk with calculated risk_score and default OPEN status', async () => {
      const mockRow = {
        id: validUuid,
        project_id: projectUuid,
        title: 'Database Delay',
        description: 'Potential database delay',
        probability: 'MEDIUM',
        impact: 'HIGH',
        risk_score: 6,
        status: 'OPEN',
        mitigation_plan: 'Staging test',
        owner_id: ownerUuid,
        due_date: '2026-10-15T00:00:00Z',
        created_at: '2026-09-26T12:00:00Z',
        updated_at: '2026-09-26T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const result = await service.create({
        project_id: projectUuid,
        title: 'Database Delay',
        description: 'Potential database delay',
        probability: RiskProbability.MEDIUM,
        impact: RiskImpact.HIGH,
        mitigation_plan: 'Staging test',
        owner_id: ownerUuid,
        due_date: '2026-10-15T00:00:00Z',
      });

      expect(result.id).toBe(validUuid);
      expect(result.risk_score).toBe(6);
      expect(result.status).toBe('OPEN');
    });

    it('18. should reject invalid input behavior on creation (invalid project_id UUID)', async () => {
      await expect(
        service.create({
          project_id: 'invalid-uuid',
          title: 'Invalid Risk',
          probability: RiskProbability.LOW,
          impact: RiskImpact.LOW,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // 8. Risk retrieval & 17. Not-found behavior
  describe('findOne', () => {
    it('8. should retrieve a risk by valid ID', async () => {
      const mockRow = {
        id: validUuid,
        project_id: projectUuid,
        title: 'Risk 1',
        probability: 'HIGH',
        impact: 'HIGH',
        risk_score: 9,
        status: 'OPEN',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findOne(validUuid);
      expect(result.id).toBe(validUuid);
      expect(result.risk_score).toBe(9);
    });

    it('17. should throw NotFoundException when risk is not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(service.findOne(validUuid)).rejects.toThrow(NotFoundException);
    });
  });

  // 9, 10, 11, 12, 13, 14. List, Filtering & Pagination
  describe('findAll', () => {
    it('9. & 14. should return paginated list of risks', async () => {
      const mockRows = [
        {
          id: validUuid,
          project_id: projectUuid,
          title: 'Risk 1',
          probability: 'LOW',
          impact: 'LOW',
          risk_score: 1,
          status: 'OPEN',
          created_at: '2026-09-26T12:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockRows,
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
      expect(result.meta.limit).toBe(20);
    });

    it('10. should filter risks by project_id', async () => {
      const mockEq = vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await service.findAll({ project_id: projectUuid });
      expect(mockEq).toHaveBeenCalledWith('project_id', projectUuid);
    });

    it('11. should filter risks by status', async () => {
      const mockEq = vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await service.findAll({ status: RiskStatus.MITIGATING });
      expect(mockEq).toHaveBeenCalledWith('status', RiskStatus.MITIGATING);
    });

    it('12. should filter risks by probability', async () => {
      const mockEq = vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await service.findAll({ probability: RiskProbability.HIGH });
      expect(mockEq).toHaveBeenCalledWith('probability', RiskProbability.HIGH);
    });

    it('13. should filter risks by impact', async () => {
      const mockEq = vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await service.findAll({ impact: RiskImpact.HIGH });
      expect(mockEq).toHaveBeenCalledWith('impact', RiskImpact.HIGH);
    });
  });

  // 7 & 15. Risk update & recalculation
  describe('update', () => {
    it('7. & 15. should update risk details and recalculate risk_score when probability/impact changes', async () => {
      const existing = {
        id: validUuid,
        project_id: projectUuid,
        title: 'Risk 1',
        probability: RiskProbability.LOW,
        impact: RiskImpact.LOW,
        risk_score: 1,
        status: RiskStatus.OPEN,
      };

      const updatedRow = {
        ...existing,
        probability: 'HIGH',
        impact: 'HIGH',
        risk_score: 9,
        status: 'MITIGATING',
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(existing as any);

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.update(validUuid, {
        probability: RiskProbability.HIGH,
        impact: RiskImpact.HIGH,
        status: RiskStatus.MITIGATING,
      });

      expect(result.risk_score).toBe(9);
      expect(result.status).toBe('MITIGATING');
    });
  });

  // 16. Risk deletion
  describe('remove', () => {
    it('16. should delete an existing risk successfully', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
      } as any);

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      };

      const result = await service.remove(validUuid);
      expect(result.message).toBe('Risk deleted successfully');
      expect(result.id).toBe(validUuid);
    });
  });
});
