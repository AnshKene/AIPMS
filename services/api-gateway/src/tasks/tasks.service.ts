import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class TasksService {
  private readonly taskServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('TASK_SERVICE_URL') ??
      'http://localhost:3004';
    this.taskServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.taskServiceUrl,
      'Task service',
      req,
      res,
    );
  }
}
