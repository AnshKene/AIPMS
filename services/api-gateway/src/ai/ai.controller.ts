import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AiService } from './ai.service.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to AI Intelligence Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - AI service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - AI service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.aiService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to AI Intelligence Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - AI service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - AI service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.aiService.forward(req, res);
  }
}
