import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import {
  NaturalLanguageQueryDto,
  SimulationRequestDto,
} from './dto/ai-request.dto.js';
import {
  ActionPlanResponseDto,
  AiAnalysisResponseDto,
  BottleneckAnalysisResponseDto,
  DeliveryPredictionResponseDto,
  EmergingRisksResponseDto,
  NaturalLanguageQueryResponseDto,
  ProjectBriefResponseDto,
  SimulationResponseDto,
} from './dto/ai-response.dto.js';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── 1. Health Summary & Project Intelligence ───────────────────────────────

  @Post('projects/:projectId/health-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI Project Health Summary',
    description:
      'Aggregates authorized project information, tasks, sprints, dependencies, and risks to compute a deterministic health score, delivery trajectory, and explainable early-warning signals.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'AI Health summary generated successfully',
    type: AiAnalysisResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getHealthSummary(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    return this.aiService.getHealthSummary(projectId, authHeader);
  }

  @Post('projects/:projectId/project-intelligence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias for health summary & project intelligence' })
  async getProjectIntelligence(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    return this.aiService.getHealthSummary(projectId, authHeader);
  }

  // ─── 2. Risk Mitigation & Delivery Impact ───────────────────────────────────

  @Post('projects/:projectId/risk-mitigation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI Risk Mitigation Strategies',
    description:
      'Analyzes project risks, correlating high-severity items with active sprint delivery impact and formulating actionable mitigation strategies.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'AI Risk mitigation analysis generated successfully',
    type: AiAnalysisResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getRiskMitigation(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    return this.aiService.getRiskMitigation(projectId, authHeader);
  }

  // ─── 3. Workload Balance ──────────────────────────────────────────────────────

  @Post('projects/:projectId/workload-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI Workload Balance Recommendations',
    description:
      'Analyzes team capacity, active/overdue task allocation, and bottlenecks to generate capacity rebalancing recommendations.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'AI Workload balance recommendations generated successfully',
    type: AiAnalysisResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getWorkloadBalance(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    return this.aiService.getWorkloadBalance(projectId, authHeader);
  }

  // ─── 4. Bottleneck & Critical Path Graph Intelligence ───────────────────────

  @Post('projects/:projectId/bottlenecks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze Dependency Graph & Cascading Blockers (POST)',
    description:
      'Performs graph analysis on task dependencies to identify critical paths, longest dependency chains, and cascading blockers.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Bottleneck analysis generated successfully',
    type: BottleneckAnalysisResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getBottlenecks(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<BottleneckAnalysisResponseDto> {
    return this.aiService.getBottleneckAnalysis(projectId, authHeader);
  }

  @Get('projects/:projectId/bottlenecks')
  @ApiOperation({
    summary: 'Analyze Dependency Graph & Cascading Blockers (GET)',
    description:
      'Performs graph analysis on task dependencies to identify critical paths, longest dependency chains, and cascading blockers.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Bottleneck analysis retrieved successfully',
    type: BottleneckAnalysisResponseDto,
  })
  async getBottlenecksGet(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<BottleneckAnalysisResponseDto> {
    return this.aiService.getBottleneckAnalysis(projectId, authHeader);
  }

  // ─── 5. What-If Project Simulator ───────────────────────────────────────────

  @Post('projects/:projectId/simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute Hypothetical What-If Project Simulation',
    description:
      'Calculates simulated health scores and delivery trajectory for hypothetical interventions (moving overdue tasks, resolving risks, extending deadlines) without modifying database records.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Simulation completed successfully',
    type: SimulationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID or input payload' })
  async simulateScenario(
    @Param('projectId') projectId: string,
    @Body() dto: SimulationRequestDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<SimulationResponseDto> {
    return this.aiService.simulateScenario(projectId, dto, authHeader);
  }

  @Post('projects/:projectId/what-if')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias for What-If Project Simulation' })
  async whatIfScenario(
    @Param('projectId') projectId: string,
    @Body() dto: SimulationRequestDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<SimulationResponseDto> {
    return this.aiService.simulateScenario(projectId, dto, authHeader);
  }

  // ─── 6. Executive Project Brief ─────────────────────────────────────────────

  @Post('projects/:projectId/brief')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Executive Project Brief',
    description:
      'Synthesizes an executive-level status brief highlighting what is going well, critical bottlenecks, top risks, and prioritized action plan.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Executive project brief generated successfully',
    type: ProjectBriefResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getProjectBrief(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<ProjectBriefResponseDto> {
    return this.aiService.getProjectBrief(projectId, authHeader);
  }

  // ─── 7. Safe Natural Language Project Copilot / Query ───────────────────────

  @Post('projects/:projectId/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask Natural Language Question About Project State',
    description:
      'Safely answers natural language inquiries regarding project health, blockers, risks, workload, and sprint delivery using allowlisted intent extraction and deterministic project facts.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Query answered successfully',
    type: NaturalLanguageQueryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID or query payload' })
  async queryProject(
    @Param('projectId') projectId: string,
    @Body() dto: NaturalLanguageQueryDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<NaturalLanguageQueryResponseDto> {
    return this.aiService.queryProject(projectId, dto, authHeader);
  }

  @Post('projects/:projectId/copilot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias for Project Copilot / Query' })
  async copilotQuery(
    @Param('projectId') projectId: string,
    @Body() dto: NaturalLanguageQueryDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<NaturalLanguageQueryResponseDto> {
    return this.aiService.queryProject(projectId, dto, authHeader);
  }

  // ─── 8. Emerging Behavioral Risks ───────────────────────────────────────────

  @Post('projects/:projectId/emerging-risks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detect Emerging Behavioral Project Risks',
    description:
      'Identifies unmanaged emerging risk patterns from project behavioral telemetry, status oscillation, and dependency pressures.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Emerging risks detected successfully',
    type: EmergingRisksResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getEmergingRisks(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<EmergingRisksResponseDto> {
    return this.aiService.getEmergingRisks(projectId, authHeader);
  }

  // ─── 9. Delivery Prediction ─────────────────────────────────────────────────

  @Post('projects/:projectId/delivery-prediction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate Explainable Delivery Trajectory & Prediction',
    description:
      'Computes milestone delivery trajectory, confidence justification, required pace, and projected completion date using deterministic velocity signals.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Delivery prediction calculated successfully',
    type: DeliveryPredictionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getDeliveryPrediction(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<DeliveryPredictionResponseDto> {
    return this.aiService.getDeliveryPrediction(projectId, authHeader);
  }

  // ─── 10. Prioritized Action Plan ────────────────────────────────────────────

  @Post('projects/:projectId/action-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Prioritized Action Plan',
    description:
      'Synthesizes an evidence-backed action checklist prioritizing critical blockers, top risks, schedule adjustments, and workload balancing.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiOkResponse({
    description: 'Action plan generated successfully',
    type: ActionPlanResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or query error' })
  async getActionPlan(
    @Param('projectId') projectId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<ActionPlanResponseDto> {
    return this.aiService.getActionPlan(projectId, authHeader);
  }
}
