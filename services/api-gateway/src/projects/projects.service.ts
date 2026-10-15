import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ProxyService } from '../common/services/proxy.service.js';

@Injectable()
export class ProjectsService {
  private readonly projectServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {
    const rawUrl =
      this.configService.get<string>('PROJECT_SERVICE_URL') ??
      'http://localhost:3002';
    this.projectServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async forward(req: Request, res?: Response) {
    return this.proxyService.forwardRequest(
      this.projectServiceUrl,
      'Project service',
      req,
      res,
    );
  }
}
