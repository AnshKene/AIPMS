import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class AiService {
  private readonly aiServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:3009';
    this.aiServiceUrl = rawUrl.replace(/\/+$/, '');
    this.timeoutMs = parseInt(
      this.configService.get<string>('AI_SERVICE_TIMEOUT_MS') ?? '45000',
      10,
    );
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.aiServiceUrl,
      'AI service',
      req,
      res,
      this.timeoutMs,
    );
  }
}
