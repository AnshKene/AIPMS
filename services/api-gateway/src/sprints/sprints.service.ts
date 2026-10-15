import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class SprintsService {
  private readonly sprintServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('SPRINT_SERVICE_URL') ??
      'http://localhost:3005';
    this.sprintServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.sprintServiceUrl,
      'Sprint service',
      req,
      res,
    );
  }
}
