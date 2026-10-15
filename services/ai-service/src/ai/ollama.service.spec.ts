import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { OllamaService } from './ollama.service.js';

describe('OllamaService', () => {
  let service: OllamaService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'ollama.url') return 'http://localhost:11434';
        if (key === 'ollama.model') return 'llama3.2';
        if (key === 'ollama.timeoutMs') return 30000;
        return undefined;
      }),
    };
    service = new OllamaService(mockConfigService as ConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse valid JSON response from Ollama /api/chat', async () => {
    const mockAiResponse = {
      summary: 'Project is progressing well.',
      insights: ['Insight 1', 'Insight 2'],
      recommendations: ['Rec 1', 'Rec 2'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify(mockAiResponse) },
      }),
    });

    const fallback = {
      summary: 'Fallback summary',
      insights: ['Fallback insight'],
      recommendations: ['Fallback rec'],
    };

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => fallback,
    );

    expect(result.generatedBy).toBe('ollama');
    expect(result.summary).toBe(mockAiResponse.summary);
    expect(result.insights).toEqual(mockAiResponse.insights);
    expect(result.recommendations).toEqual(mockAiResponse.recommendations);
  });

  it('should handle markdown fenced JSON response from Ollama', async () => {
    const mockAiResponse = {
      summary: 'Fenced summary.',
      insights: ['Insight A'],
      recommendations: ['Rec A'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: `\`\`\`json\n${JSON.stringify(mockAiResponse)}\n\`\`\``,
        },
      }),
    });

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => ({
        summary: 'Fallback',
        insights: [],
        recommendations: [],
      }),
    );

    expect(result.generatedBy).toBe('ollama');
    expect(result.summary).toBe('Fenced summary.');
  });

  it('should use deterministic fallback when Ollama returns non-200 HTTP status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const fallback = {
      summary: 'Fallback summary',
      insights: ['Fallback insight 1'],
      recommendations: ['Fallback rec 1'],
    };

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => fallback,
    );

    expect(result.generatedBy).toBe('deterministic-fallback');
    expect(result.summary).toBe(fallback.summary);
    expect(result.insights).toEqual(fallback.insights);
  });

  it('should use deterministic fallback when Ollama is unreachable or throws network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const fallback = {
      summary: 'Fallback on error',
      insights: ['Insight on error'],
      recommendations: ['Rec on error'],
    };

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => fallback,
    );

    expect(result.generatedBy).toBe('deterministic-fallback');
    expect(result.summary).toBe(fallback.summary);
  });

  it('should use deterministic fallback when Ollama returns empty response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '' } }),
    });

    const fallback = {
      summary: 'Fallback on empty',
      insights: [],
      recommendations: [],
    };

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => fallback,
    );

    expect(result.generatedBy).toBe('deterministic-fallback');
    expect(result.summary).toBe(fallback.summary);
  });

  it('should use deterministic fallback when Ollama returns malformed non-JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: 'Sorry I cannot output JSON right now' },
      }),
    });

    const fallback = {
      summary: 'Fallback on malformed',
      insights: ['Insight 1'],
      recommendations: ['Rec 1'],
    };

    const result = await service.generateStructuredAnalysis(
      'System instructions',
      'Context data',
      () => fallback,
    );

    expect(result.generatedBy).toBe('deterministic-fallback');
    expect(result.summary).toBe(fallback.summary);
  });
});
