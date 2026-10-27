import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;

  const mockConfigValues: Record<string, string> = {
    'supabase.url': 'https://mock.supabase.co',
    'supabase.anonKey': 'mock-anon-key',
    'supabase.serviceRoleKey': 'mock-service-role-key',
  };

  const createServiceWithConfig = async (configOverride: Record<string, string | null>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) =>
              configOverride[key] !== undefined ? configOverride[key] : mockConfigValues[key],
            ),
          },
        },
      ],
    }).compile();

    return module.get<AuditService>(AuditService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await createServiceWithConfig({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('key selection and initialization', () => {
    it('should initialize using serviceRoleKey when configured', async () => {
      const getSpy = vi.fn((key: string) => mockConfigValues[key]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditService,
          {
            provide: ConfigService,
            useValue: { get: getSpy },
          },
        ],
      }).compile();

      const auditService = module.get<AuditService>(AuditService);
      expect(auditService).toBeDefined();
      expect(getSpy).toHaveBeenCalledWith('supabase.serviceRoleKey');
      expect((auditService as any).supabase).toBeDefined();
    });

    it('should warn and fallback to anonKey when serviceRoleKey is missing', async () => {
      const warnSpy = vi.spyOn(Logger.prototype, 'warn');
      const auditService = await createServiceWithConfig({ 'supabase.serviceRoleKey': null });

      expect(auditService).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY is not configured'),
      );
      expect((auditService as any).supabase).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('recordEvent and database failure handling', () => {
    it('should successfully record event in memory and write to database', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const record = await service.recordEvent({
        actorId: 'user-001',
        action: 'PROJECT_CREATED',
        targetResource: 'proj-123',
        context: { name: 'Alpha' },
      });

      expect(record.id).toBeDefined();
      expect(record.action).toBe('PROJECT_CREATED');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_id: 'user-001',
          action: 'PROJECT_CREATED',
        }),
      ]);
    });

    it('should explicitly log error and not throw when database insert fails', async () => {
      const errorSpy = vi.spyOn((service as any).logger, 'error');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'new row violates row-level security policy', code: '42501' },
      });
      (service as any).supabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      };

      const record = await service.recordEvent({
        actorId: 'user-001',
        action: 'SECURITY_EVENT',
      });

      expect(record.id).toBeDefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed server-side audit write to database: new row violates row-level security policy'),
      );

      // Record must be preserved in memory log despite database failure
      const query = await service.queryLogs({ action: 'SECURITY_EVENT' });
      expect(query.items.length).toBe(1);
      expect(query.items[0].id).toBe(record.id);
    });

    it('should redact sensitive keys from context', async () => {
      const record = await service.recordEvent({
        actorId: 'user-001',
        action: 'USER_LOGIN',
        context: {
          password: 'SecretPassword123',
          token: 'jwt.token.here',
          safeParam: 'public-data',
        },
      });

      expect(record.context?.password).toBe('[REDACTED]');
      expect(record.context?.token).toBe('[REDACTED]');
      expect(record.context?.safeParam).toBe('public-data');
    });
  });
});
