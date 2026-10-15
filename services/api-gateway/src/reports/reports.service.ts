import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class ReportsService {
  private readonly reportingServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('REPORTING_SERVICE_URL') ??
      'http://localhost:3007';
    this.reportingServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.reportingServiceUrl,
      'Reporting service',
      req,
      res,
    );
  }
}
