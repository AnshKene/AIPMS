import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to Reporting Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Reporting service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Reporting service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.reportsService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to Reporting Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Reporting service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Reporting service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.reportsService.forward(req, res);
  }
}
