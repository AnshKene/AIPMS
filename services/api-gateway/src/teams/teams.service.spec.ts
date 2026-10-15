import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { TeamsService } from './teams.service.js';
import { ProxyService } from '../common/services/proxy.service.js';
import type { Request } from 'express';

describe('TeamsService', () => {
  let service: TeamsService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'TEAM_SERVICE_URL') return 'http://localhost:3003';
      return null;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        ProxyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward request to Team Service', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/teams',
      headers: { authorization: 'Bearer token-123' },
    } as unknown as Request;

    const mockResponseData = [{ id: 't-1', name: 'Team Alpha' }];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.forward(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3003/api/teams',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('should throw ServiceUnavailableException when Team Service fails to connect', async () => {
    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/teams',
      headers: {},
    } as unknown as Request;

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(service.forward(mockRequest)).rejects.toThrow(ServiceUnavailableException);
  });
});
