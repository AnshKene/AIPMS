import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { SprintsService } from './sprints.service.js';
import { ProxyService } from '../common/services/proxy.service.js';
import type { Request } from 'express';

describe('SprintsService', () => {
  let service: SprintsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'SPRINT_SERVICE_URL') return 'http://localhost:3005';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        ProxyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward request to Sprint Service', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/sprints',
      headers: { authorization: 'Bearer token-123' },
    } as unknown as Request;

    const mockResponseData = [{ id: 'sp-1', name: 'Sprint 1' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.forward(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3005/api/sprints',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('should throw ServiceUnavailableException when Sprint Service fails to connect', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/sprints',
      headers: {},
    } as unknown as Request;

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(service.forward(mockRequest)).rejects.toThrow(ServiceUnavailableException);
  });
});
