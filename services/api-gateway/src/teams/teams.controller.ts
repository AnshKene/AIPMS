import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TeamsService } from './teams.service.js';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to Team Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Team service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Team service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.teamsService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to Team Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Team service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Team service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.teamsService.forward(req, res);
  }
}
