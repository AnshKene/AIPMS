import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ExplainableSignal {
  title: string;
  category: 'SCHEDULE' | 'BLOCKER' | 'RISK' | 'WORKLOAD' | 'DEPENDENCY';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  observation: string;
  evidence: string[];
  reasoning: string;
  recommendation: string;
  expectedImpact: string;
}

export interface RiskDeliveryImpact {
  riskId: string;
  riskTitle: string;
  riskScore: number;
  deliveryImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedTasksCount: number;
  isAffectingActiveSprint: boolean;
  mitigationPlan?: string;
}

export interface DataSufficiencyInfo {
  sufficient: boolean;
  level: 'FULL' | 'MODERATE' | 'LOW' | 'MINIMAL';
  telemetryCompleteness: number;
  reasons: string[];
  missingDimensions: string[];
}

export class AiAnalysisResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({
    description: 'Type of AI analysis performed',
    enum: ['health-summary', 'risk-mitigation', 'workload-balance'],
  })
  analysisType!: 'health-summary' | 'risk-mitigation' | 'workload-balance';

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiPropertyOptional({
    description: 'Calculated project health score from 0 (Critical) to 100 (Optimal)',
    example: 85,
  })
  healthScore?: number;

  @ApiPropertyOptional({
    description: 'Project health classification based on multi-module weighted indicators',
    enum: ['HEALTHY', 'MODERATE_RISK', 'AT_RISK', 'CRITICAL'],
  })
  healthStatus?: 'HEALTHY' | 'MODERATE_RISK' | 'AT_RISK' | 'CRITICAL';

  @ApiPropertyOptional({
    description: 'Estimated sprint / milestone delivery pace trajectory',
    enum: ['ON_TRACK', 'BEHIND_SCHEDULE', 'AT_RISK', 'INSUFFICIENT_DATA'],
  })
  deliveryTrajectory?: 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'AT_RISK' | 'INSUFFICIENT_DATA';

  @ApiPropertyOptional({
    description: 'Confidence percentage in the calculated trajectory',
    example: 82,
  })
  executionConfidence?: number;

  @ApiPropertyOptional({
    description: 'Aggregate risk exposure classification',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  riskExposure?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({
    description: 'Dependency graph bottleneck pressure',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  dependencyPressure?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({
    description: 'Team workload balance pressure',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  workloadPressure?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({
    description: 'Active sprint progress stability',
    enum: ['STABLE', 'VOLATILE', 'AT_RISK', 'INSUFFICIENT_DATA'],
  })
  sprintStability?: 'STABLE' | 'VOLATILE' | 'AT_RISK' | 'INSUFFICIENT_DATA';

  @ApiPropertyOptional({
    description: 'Explicit data sufficiency and telemetry completeness metrics',
  })
  dataSufficiency?: DataSufficiencyInfo;

  @ApiProperty({ description: 'High-level narrative summary' })
  summary!: string;

  @ApiProperty({
    description: 'Key analytical insights extracted from project data',
    type: [String],
  })
  insights!: string[];

  @ApiProperty({
    description: 'Actionable recommendations for project leads and teams',
    type: [String],
  })
  recommendations!: string[];

  @ApiPropertyOptional({
    description: 'Structured explainable early-warning signals with evidence and impact breakdown',
    type: 'array',
  })
  signals?: ExplainableSignal[];

  @ApiPropertyOptional({
    description: 'Computed underlying metrics used for the analysis',
    type: 'object',
    additionalProperties: true,
  })
  metrics?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'List of analyzed risk records if applicable',
    type: 'array',
  })
  risks?: unknown[];

  @ApiPropertyOptional({
    description: 'Correlated delivery impact of project risks',
    type: 'array',
  })
  riskDeliveryImpact?: RiskDeliveryImpact[];

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export interface BottleneckItem {
  taskId: string;
  taskTitle: string;
  status: string;
  priority: string;
  isBlockedOrOverdue: boolean;
  directDownstreamCount: number;
  transitiveDownstreamCount: number;
  affectedSprintTasksCount: number;
  impactSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CascadingBlockerItem {
  blockerTaskId: string;
  blockerTitle: string;
  blockedTasksCount: number;
  blockedTaskTitles: string[];
  sprintImpact: string;
}

export class BottleneckAnalysisResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({ description: 'Total tasks analyzed' })
  totalTasks!: number;

  @ApiProperty({ description: 'Total dependency edges evaluated' })
  dependencyCount!: number;

  @ApiProperty({
    description: 'Overall dependency pressure on delivery',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  dependencyPressure!: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({ description: 'Whether circular dependencies were detected' })
  hasCycles!: boolean;

  @ApiProperty({
    description: 'Longest sequential dependency chain identified',
    type: [String],
  })
  longestDependencyChain!: string[];

  @ApiProperty({
    description: 'Key bottleneck tasks blocking downstream progress',
    type: 'array',
  })
  bottlenecks!: BottleneckItem[];

  @ApiProperty({
    description: 'Direct and transitive cascading blocker pathways',
    type: 'array',
  })
  cascadingBlockers!: CascadingBlockerItem[];

  @ApiProperty({
    description: 'Actionable graph-level recommendations',
    type: [String],
  })
  recommendations!: string[];

  @ApiPropertyOptional({
    description: 'Explicit data sufficiency diagnostics',
  })
  dataSufficiency?: DataSufficiencyInfo;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export interface SimulationStateMetrics {
  healthScore: number;
  healthStatus: 'HEALTHY' | 'MODERATE_RISK' | 'AT_RISK' | 'CRITICAL';
  deliveryTrajectory: 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'AT_RISK' | 'INSUFFICIENT_DATA';
  overdueTasks: number;
  highSeverityRisks: number;
  blockedTasks: number;
  activeSprintTasks: number;
}

export interface SimulationDeltaMetrics {
  healthScoreDelta: number;
  overdueTasksDelta: number;
  highSeverityRisksDelta: number;
  blockedTasksDelta: number;
}

export class SimulationResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiProperty({ description: 'Indicates this is a hypothetical simulation only' })
  isSimulation: boolean = true;

  @ApiProperty({ description: 'Explicit simulation disclaimer' })
  disclaimer: string = 'SIMULATION ONLY: No persistent changes made to project database.';

  @ApiProperty({ description: 'Scenario identifier executed' })
  scenario!: string;

  @ApiProperty({ description: 'Detailed scenario description and parameters' })
  scenarioDescription!: string;

  @ApiProperty({ description: 'Actual baseline project metrics' })
  baseline!: SimulationStateMetrics;

  @ApiProperty({ description: 'Simulated hypothetical project metrics' })
  simulated!: SimulationStateMetrics;

  @ApiProperty({ description: 'Numerical delta between baseline and simulation' })
  delta!: SimulationDeltaMetrics;

  @ApiProperty({
    description: 'Transparent trade-off implications of the simulated scenario',
    type: [String],
  })
  tradeOffs!: string[];

  @ApiProperty({
    description: 'Actionable recommendations should the team decide to apply the scenario',
    type: [String],
  })
  recommendations!: string[];

  @ApiPropertyOptional({
    description: 'Explicit data sufficiency diagnostics',
  })
  dataSufficiency?: DataSufficiencyInfo;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export class ProjectBriefResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({ description: 'Concise executive brief summary' })
  executiveSummary!: string;

  @ApiProperty({
    description: 'Positive progress highlights and stable areas',
    type: [String],
  })
  whatIsGoingWell!: string[];

  @ApiProperty({
    description: 'Critical areas requiring immediate management attention',
    type: [String],
  })
  whatNeedsAttention!: string[];

  @ApiProperty({
    description: 'High-impact bottlenecks impeding velocity',
    type: [String],
  })
  criticalBottlenecks!: string[];

  @ApiProperty({
    description: 'Top unresolved risks threatening project milestones',
    type: [String],
  })
  topDeliveryRisks!: string[];

  @ApiProperty({
    description: 'Prioritized action plan for the project lead and team',
    type: [String],
  })
  actionPlan!: string[];

  @ApiProperty({
    description: 'Deterministic metrics snapshot used to formulate the brief',
    type: 'object',
    additionalProperties: true,
  })
  metricsSnapshot!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Explicit data sufficiency diagnostics',
  })
  dataSufficiency?: DataSufficiencyInfo;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export interface QueryEvidenceItem {
  metric: string;
  value: string | number;
  source: string;
}

export class NaturalLanguageQueryResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiProperty({ description: 'Original user question' })
  query!: string;

  @ApiProperty({
    description: 'Recognized structured intent category',
    enum: [
      'PROJECT_HEALTH',
      'BLOCKERS',
      'RISKS',
      'WORKLOAD',
      'SPRINT_STATUS',
      'RECOMMENDATIONS',
      'SIMULATION_HELP',
      'UNSUPPORTED',
    ],
  })
  detectedIntent!:
    | 'PROJECT_HEALTH'
    | 'BLOCKERS'
    | 'RISKS'
    | 'WORKLOAD'
    | 'SPRINT_STATUS'
    | 'RECOMMENDATIONS'
    | 'SIMULATION_HELP'
    | 'UNSUPPORTED';

  @ApiProperty({ description: 'Evidence-backed answer to the question' })
  answer!: string;

  @ApiProperty({
    description: 'Deterministic fact points supporting the answer',
    type: 'array',
  })
  evidence!: QueryEvidenceItem[];

  @ApiProperty({
    description: 'Follow-up query suggestions based on project context',
    type: [String],
  })
  suggestedQuestions!: string[];

  @ApiPropertyOptional({
    description: 'Explicit data sufficiency diagnostics',
  })
  dataSufficiency?: DataSufficiencyInfo;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export interface EmergingRiskItem {
  id: string;
  patternType:
    | 'STATUS_OSCILLATION'
    | 'DEADLINE_PROXIMITY_BLOCK'
    | 'WORKLOAD_CONCENTRATION'
    | 'SPRINT_BURNDOWN_DEFICIT'
    | 'DEPENDENCY_BOTTLENECK';
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedFrom: string;
  evidence: string[];
  impact: string;
  recommendedMitigation: string;
  isOfficialRisk: boolean;
}

export class EmergingRisksResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({ description: 'Total emerging behavioral risks identified' })
  totalDetected!: number;

  @ApiProperty({
    description: 'List of unmanaged, behavioral emerging risk patterns',
    type: 'array',
  })
  emergingRisks!: EmergingRiskItem[];

  @ApiProperty({ description: 'High-level synthesis summary' })
  summary!: string;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export class DeliveryPredictionResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({
    description: 'Evaluated delivery trajectory',
    enum: ['ON_TRACK', 'BEHIND_SCHEDULE', 'AT_RISK', 'INSUFFICIENT_DATA'],
  })
  deliveryTrajectory!: 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'AT_RISK' | 'INSUFFICIENT_DATA';

  @ApiProperty({
    description: 'Confidence rating in trajectory prediction',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
  })
  confidence!: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({ description: 'Numerical confidence score (0 to 100%)' })
  confidencePercentage!: number;

  @ApiProperty({ description: 'Transparent justification for confidence level' })
  confidenceReason!: string;

  @ApiProperty({ description: 'Observed daily velocity pace' })
  currentPaceTasksPerDay!: number;

  @ApiProperty({ description: 'Required daily pace to meet milestone deadline' })
  requiredPaceTasksPerDay!: number;

  @ApiProperty({ description: 'Days remaining until milestone deadline' })
  remainingDays!: number;

  @ApiProperty({ description: 'Incomplete tasks remaining in scope' })
  remainingTasks!: number;

  @ApiPropertyOptional({ description: 'Projected completion timestamp if velocity pace is maintained' })
  estimatedCompletionDate?: string | null;

  @ApiProperty({ description: 'Analytical narrative summary' })
  summary!: string;

  @ApiProperty({ description: 'Signals that influenced the trajectory', type: [String] })
  signals!: string[];

  @ApiProperty({ description: 'Primary recommended intervention' })
  recommendedIntervention!: string;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}

export interface ActionPlanItem {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'BLOCKER' | 'RISK' | 'WORKLOAD' | 'SCHEDULE' | 'SCOPE';
  title: string;
  description: string;
  targetEntity: string;
  expectedImpact: string;
  evidence: string[];
}

export class ActionPlanResponseDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Project Name' })
  projectName?: string;

  @ApiProperty({ description: 'Total prioritized actions generated' })
  totalActions!: number;

  @ApiProperty({
    description: 'Prioritized, short, actionable intervention checklist',
    type: 'array',
  })
  actions!: ActionPlanItem[];

  @ApiProperty({ description: 'High level summary of the action plan' })
  summary!: string;

  @ApiProperty({
    description: 'Generation source: either local Ollama or deterministic fallback',
    enum: ['ollama', 'deterministic-fallback'],
  })
  generatedBy!: 'ollama' | 'deterministic-fallback';

  @ApiProperty({ description: 'ISO timestamp when the analysis was generated' })
  generatedAt!: string;
}
