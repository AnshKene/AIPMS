import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RisksService } from './risks.service.js';

@ApiTags('Risks')
@ApiBearerAuth()
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to Risk Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Risk service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Risk service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.risksService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to Risk Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Risk service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Risk service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.risksService.forward(req, res);
  }
}
