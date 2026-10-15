import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import { ProxyService } from '../common/services/proxy.service.js';
import type { Request } from 'express';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'REPORTING_SERVICE_URL') return 'http://localhost:3007';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        ProxyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward request to Reporting Service', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/reports/projects/11111111-1111-4111-a111-111111111111/overview',
      headers: { authorization: 'Bearer token-123' },
    } as unknown as Request;

    const mockResponseData = { totalTasks: 5 };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.forward(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3007/api/reports/projects/11111111-1111-4111-a111-111111111111/overview',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('should throw ServiceUnavailableException when Reporting Service fails to connect', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/reports',
      headers: {},
    } as unknown as Request;

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(service.forward(mockRequest)).rejects.toThrow(ServiceUnavailableException);
  });
});
