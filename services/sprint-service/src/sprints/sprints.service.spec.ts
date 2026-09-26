import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { SprintsService } from './sprints.service.js';
import { SprintStatus } from './enums/sprint-status.enum.js';

describe('SprintsService', () => {
  let service: SprintsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'supabase.url') return 'https://mock.supabase.co';
      if (key === 'supabase.anonKey') return 'mock-anon-key';
      return null;
    }),
  };

  const validUuid = '11111111-1111-4111-a111-111111111111';
  const projectUuid = '22222222-2222-4222-b222-222222222222';

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. Create sprint
  describe('create', () => {
    it('1. should create a sprint with status PLANNED', async () => {
      const mockRow = {
        id: validUuid,
        project_id: projectUuid,
        name: 'Sprint 1',
        goal: 'Build foundation',
        status: 'PLANNED',
        start_date: '2026-10-01T00:00:00Z',
        end_date: '2026-10-14T23:59:59Z',
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
        name: 'Sprint 1',
        goal: 'Build foundation',
        start_date: '2026-10-01T00:00:00Z',
        end_date: '2026-10-14T23:59:59Z',
      });

      expect(result.id).toBe(validUuid);
      expect(result.status).toBe('PLANNED');
      expect(result.name).toBe('Sprint 1');
    });

    // 18. Reject invalid date range
    it('18. should reject invalid date range on creation', async () => {
      await expect(
        service.create({
          project_id: projectUuid,
          name: 'Invalid Sprint',
          start_date: '2026-10-20T00:00:00Z',
          end_date: '2026-10-10T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // 2. List sprints
  describe('findAll', () => {
    it('2. should return paginated list of sprints', async () => {
      const mockRows = [
        {
          id: validUuid,
          project_id: projectUuid,
          name: 'Sprint 1',
          status: 'PLANNED',
          start_date: '2026-10-01T00:00:00Z',
          end_date: '2026-10-14T23:59:59Z',
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
    });
  });

  // 3. Get sprint
  describe('findOne', () => {
    it('3. should return a sprint by valid ID', async () => {
      const mockRow = {
        id: validUuid,
        project_id: projectUuid,
        name: 'Sprint 1',
        status: 'PLANNED',
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      const result = await service.findOne(validUuid);
      expect(result.id).toBe(validUuid);
    });

    it('should throw NotFoundException when sprint is not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      await expect(service.findOne(validUuid)).rejects.toThrow(NotFoundException);
    });
  });

  // 4. Update sprint
  describe('update', () => {
    it('4. should update a sprint successfully', async () => {
      const existing = {
        id: validUuid,
        project_id: projectUuid,
        name: 'Sprint 1',
        status: 'PLANNED',
        start_date: '2026-10-01T00:00:00Z',
        end_date: '2026-10-14T23:59:59Z',
      };

      const updatedRow = {
        ...existing,
        name: 'Sprint 1 Updated',
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
        name: 'Sprint 1 Updated',
      });

      expect(result.name).toBe('Sprint 1 Updated');
    });
  });

  // 5-8. Deletion rules
  describe('remove', () => {
    it('5. should delete a PLANNED sprint successfully', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.PLANNED,
      } as any);

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      };

      const result = await service.remove(validUuid);
      expect(result.message).toBe('Sprint deleted successfully');
    });

    it('6. should reject deletion of ACTIVE sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.ACTIVE,
      } as any);

      await expect(service.remove(validUuid)).rejects.toThrow(ConflictException);
    });

    it('7. should reject deletion of COMPLETED sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.COMPLETED,
      } as any);

      await expect(service.remove(validUuid)).rejects.toThrow(ConflictException);
    });

    it('8. should reject deletion of CANCELLED sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.CANCELLED,
      } as any);

      await expect(service.remove(validUuid)).rejects.toThrow(ConflictException);
    });
  });

  // 9-12. Start rules
  describe('start', () => {
    it('9. should start a PLANNED sprint', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.PLANNED,
      } as any);

      const updatedRow = {
        id: validUuid,
        status: 'ACTIVE',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.start(validUuid);
      expect(result.status).toBe('ACTIVE');
    });

    it('10. should reject starting ACTIVE sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.ACTIVE,
      } as any);

      await expect(service.start(validUuid)).rejects.toThrow(ConflictException);
    });

    it('11. should reject starting COMPLETED sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.COMPLETED,
      } as any);

      await expect(service.start(validUuid)).rejects.toThrow(ConflictException);
    });

    it('12. should reject starting CANCELLED sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.CANCELLED,
      } as any);

      await expect(service.start(validUuid)).rejects.toThrow(ConflictException);
    });
  });

  // 13-14. Complete rules
  describe('complete', () => {
    it('13. should complete an ACTIVE sprint', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.ACTIVE,
      } as any);

      const updatedRow = {
        id: validUuid,
        status: 'COMPLETED',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.complete(validUuid);
      expect(result.status).toBe('COMPLETED');
    });

    it('14. should reject completing PLANNED sprint with 409 Conflict', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.PLANNED,
      } as any);

      await expect(service.complete(validUuid)).rejects.toThrow(ConflictException);
    });
  });

  // 15-17. Cancel rules & invalid lifecycle transition
  describe('cancel', () => {
    it('15. should cancel a PLANNED sprint', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.PLANNED,
      } as any);

      const updatedRow = {
        id: validUuid,
        status: 'CANCELLED',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.cancel(validUuid);
      expect(result.status).toBe('CANCELLED');
    });

    it('16. should cancel an ACTIVE sprint', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.ACTIVE,
      } as any);

      const updatedRow = {
        id: validUuid,
        status: 'CANCELLED',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      };

      const result = await service.cancel(validUuid);
      expect(result.status).toBe('CANCELLED');
    });

    it('17. should reject cancelling COMPLETED sprint with 409 Conflict (invalid lifecycle transition)', async () => {
      vi.spyOn(service, 'findOne').mockResolvedValue({
        id: validUuid,
        status: SprintStatus.COMPLETED,
      } as any);

      await expect(service.cancel(validUuid)).rejects.toThrow(ConflictException);
    });
  });
});
