import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AiService } from './ai.service.js';
import { ProxyService } from '../common/services/proxy.service.js';
import type { Request } from 'express';

describe('AiService (Gateway)', () => {
  let service: AiService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'AI_SERVICE_URL') return 'http://localhost:3009';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        ProxyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward request to AI Intelligence Service', async () => {
    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/ai/projects/11111111-1111-4111-a111-111111111111/health-summary',
      headers: { authorization: 'Bearer token-123' },
      body: {},
    } as unknown as Request;

    const mockResponseData = {
      projectId: '11111111-1111-4111-a111-111111111111',
      analysisType: 'health-summary',
      summary: 'Project on track.',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.forward(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3009/api/ai/projects/11111111-1111-4111-a111-111111111111/health-summary',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('should throw ServiceUnavailableException when AI Service fails to connect', async () => {
    const mockRequest = {
      method: 'POST',
      originalUrl: '/api/ai/projects/11111111-1111-4111-a111-111111111111/health-summary',
      headers: {},
      body: {},
    } as unknown as Request;

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(service.forward(mockRequest)).rejects.toThrow(ServiceUnavailableException);
  });
});
