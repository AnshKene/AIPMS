import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SprintsService } from './sprints.service.js';

@ApiTags('Sprints')
@ApiBearerAuth()
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to Sprint Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Sprint service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Sprint service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sprintsService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to Sprint Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Sprint service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Sprint service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sprintsService.forward(req, res);
  }
}
