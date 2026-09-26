import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class RisksService {
  private readonly riskServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('RISK_SERVICE_URL') ??
      'http://localhost:3006';
    this.riskServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.riskServiceUrl,
      'Risk service',
      req,
      res,
    );
  }
}
