import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TasksService } from './tasks.service.js';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @All('*')
  @ApiOperation({ summary: 'Forward request to Task Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Task service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Task service timed out' })
  async proxyAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.tasksService.forward(req, res);
  }

  @All()
  @ApiOperation({ summary: 'Forward root request to Task Service' })
  @ApiResponse({ status: 200, description: 'Forwarded request successful' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Task service offline' })
  @ApiResponse({ status: 504, description: 'Gateway Timeout - Task service timed out' })
  async proxyRoot(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.tasksService.forward(req, res);
  }
}
