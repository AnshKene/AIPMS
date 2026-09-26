import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── Project Overview ────────────────────────────────────────────────────────

  @Get('projects/:projectId/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get project overview report',
    description:
      'Aggregated summary of tasks, sprints, and risks for a given project.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({ description: 'Project overview report' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async getProjectOverview(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectOverview(projectId);
  }

  // ─── Tasks Report ────────────────────────────────────────────────────────────

  @Get('projects/:projectId/tasks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get task report for a project',
    description:
      'Returns total task count broken down by status and priority, plus overdue task count.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({ description: 'Task report' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async getTasksReport(@Param('projectId') projectId: string) {
    return this.reportsService.getTasksReport(projectId);
  }

  // ─── Sprints Report ──────────────────────────────────────────────────────────

  @Get('projects/:projectId/sprints')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get sprint report for a project',
    description:
      'Returns total sprint count broken down by status.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({ description: 'Sprint report' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async getSprintsReport(@Param('projectId') projectId: string) {
    return this.reportsService.getSprintsReport(projectId);
  }

  // ─── Risks Report ────────────────────────────────────────────────────────────

  @Get('projects/:projectId/risks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get risk report for a project',
    description:
      'Returns total risk count broken down by status, average risk score, and count of high-score risks (score ≥ 6).',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({ description: 'Risk report' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async getRisksReport(@Param('projectId') projectId: string) {
    return this.reportsService.getRisksReport(projectId);
  }
}
