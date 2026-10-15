/**
 * AI Intelligence API Module
 * Communicates strictly through the API Gateway at /api/ai.
 */

import { apiClient } from './client';

export type AiAnalysisType = 'health-summary' | 'risk-mitigation' | 'workload-balance';
export type AiGeneratedBy = 'ollama' | 'deterministic-fallback';
export type HealthStatus = 'HEALTHY' | 'MODERATE_RISK' | 'AT_RISK' | 'CRITICAL';
export type DeliveryTrajectory = 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'AT_RISK' | 'INSUFFICIENT_DATA';

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

export interface AiAnalysisResponse {
  projectId: string;
  projectName?: string;
  analysisType: AiAnalysisType;
  generatedBy: AiGeneratedBy;
  healthScore?: number;
  healthStatus?: HealthStatus;
  deliveryTrajectory?: DeliveryTrajectory;
  executionConfidence?: number;
  riskExposure?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencyPressure?: 'LOW' | 'MEDIUM' | 'HIGH';
  workloadPressure?: 'LOW' | 'MEDIUM' | 'HIGH';
  sprintStability?: 'STABLE' | 'VOLATILE' | 'AT_RISK' | 'INSUFFICIENT_DATA';
  dataSufficiency?: DataSufficiencyInfo;
  summary: string;
  insights: string[];
  recommendations: string[];
  signals?: ExplainableSignal[];
  metrics?: Record<string, unknown>;
  risks?: unknown[];
  riskDeliveryImpact?: RiskDeliveryImpact[];
  generatedAt: string;
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

export interface BottleneckAnalysisResponse {
  projectId: string;
  projectName?: string;
  totalTasks: number;
  dependencyCount: number;
  dependencyPressure: 'LOW' | 'MEDIUM' | 'HIGH';
  hasCycles: boolean;
  longestDependencyChain: string[];
  bottlenecks: BottleneckItem[];
  cascadingBlockers: CascadingBlockerItem[];
  recommendations: string[];
  dataSufficiency?: DataSufficiencyInfo;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
}

export type SimulationScenario =
  | 'MOVE_OVERDUE_TO_NEXT_SPRINT'
  | 'MOVE_TASKS_TO_NEXT_SPRINT'
  | 'RESOLVE_HIGH_RISKS'
  | 'EXTEND_SPRINT_DEADLINE'
  | 'REASSIGN_WORKLOAD'
  | 'CUSTOM';

export interface SimulationRequest {
  scenario: SimulationScenario;
  taskIds?: string[];
  riskIds?: string[];
  extendDays?: number;
  targetAssigneeId?: string;
  customDescription?: string;
}

export interface SimulationStateMetrics {
  healthScore: number;
  healthStatus: HealthStatus;
  deliveryTrajectory: DeliveryTrajectory;
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

export interface SimulationResponse {
  projectId: string;
  isSimulation: boolean;
  disclaimer: string;
  scenario: string;
  scenarioDescription: string;
  baseline: SimulationStateMetrics;
  simulated: SimulationStateMetrics;
  delta: SimulationDeltaMetrics;
  tradeOffs: string[];
  recommendations: string[];
  dataSufficiency?: DataSufficiencyInfo;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
}

export interface ProjectBriefResponse {
  projectId: string;
  projectName?: string;
  executiveSummary: string;
  whatIsGoingWell: string[];
  whatNeedsAttention: string[];
  criticalBottlenecks: string[];
  topDeliveryRisks: string[];
  actionPlan: string[];
  metricsSnapshot: Record<string, unknown>;
  dataSufficiency?: DataSufficiencyInfo;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
}

export interface QueryEvidenceItem {
  metric: string;
  value: string | number;
  source: string;
}

export interface NaturalLanguageQueryResponse {
  projectId: string;
  query: string;
  detectedIntent:
    | 'PROJECT_HEALTH'
    | 'BLOCKERS'
    | 'RISKS'
    | 'WORKLOAD'
    | 'SPRINT_STATUS'
    | 'RECOMMENDATIONS'
    | 'SIMULATION_HELP'
    | 'UNSUPPORTED';
  answer: string;
  evidence: QueryEvidenceItem[];
  suggestedQuestions: string[];
  dataSufficiency?: DataSufficiencyInfo;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
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

export interface EmergingRisksResponse {
  projectId: string;
  projectName?: string;
  totalDetected: number;
  emergingRisks: EmergingRiskItem[];
  summary: string;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
}

export interface DeliveryPredictionResponse {
  projectId: string;
  projectName?: string;
  deliveryTrajectory: DeliveryTrajectory;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidencePercentage: number;
  confidenceReason: string;
  currentPaceTasksPerDay: number;
  requiredPaceTasksPerDay: number;
  remainingDays: number;
  remainingTasks: number;
  estimatedCompletionDate?: string | null;
  summary: string;
  signals: string[];
  recommendedIntervention: string;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
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

export interface ActionPlanResponse {
  projectId: string;
  projectName?: string;
  totalActions: number;
  actions: ActionPlanItem[];
  summary: string;
  generatedBy: AiGeneratedBy;
  generatedAt: string;
}

export const aiApi = {
  /**
   * Generate AI project health narrative summary, quantitative scoring & insights
   */
  async healthSummary(projectId: string): Promise<AiAnalysisResponse> {
    return apiClient.post<AiAnalysisResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/health-summary`,
      {},
    );
  },

  /**
   * Generate AI risk mitigation strategies for high-severity risks (score >= 6)
   */
  async riskMitigation(projectId: string): Promise<AiAnalysisResponse> {
    return apiClient.post<AiAnalysisResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/risk-mitigation`,
      {},
    );
  },

  /**
   * Generate AI team workload balance and capacity recommendations
   */
  async workloadBalance(projectId: string): Promise<AiAnalysisResponse> {
    return apiClient.post<AiAnalysisResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/workload-balance`,
      {},
    );
  },

  /**
   * Analyze dependency graph and cascading blockers
   */
  async bottlenecks(projectId: string): Promise<BottleneckAnalysisResponse> {
    return apiClient.post<BottleneckAnalysisResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/bottlenecks`,
      {},
    );
  },

  /**
   * Execute hypothetical what-if simulation
   */
  async simulate(
    projectId: string,
    body: SimulationRequest,
  ): Promise<SimulationResponse> {
    return apiClient.post<SimulationResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/simulate`,
      body,
    );
  },

  /**
   * Generate executive project brief
   */
  async brief(projectId: string): Promise<ProjectBriefResponse> {
    return apiClient.post<ProjectBriefResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/brief`,
      {},
    );
  },

  /**
   * Safe natural language project query
   */
  async query(
    projectId: string,
    queryText: string,
  ): Promise<NaturalLanguageQueryResponse> {
    return apiClient.post<NaturalLanguageQueryResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/query`,
      { query: queryText },
    );
  },

  /**
   * Detect emerging behavioral project risks
   */
  async emergingRisks(projectId: string): Promise<EmergingRisksResponse> {
    return apiClient.post<EmergingRisksResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/emerging-risks`,
      {},
    );
  },

  /**
   * Calculate delivery trajectory and pace prediction
   */
  async deliveryPrediction(
    projectId: string,
  ): Promise<DeliveryPredictionResponse> {
    return apiClient.post<DeliveryPredictionResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/delivery-prediction`,
      {},
    );
  },

  /**
   * Generate prioritized action plan
   */
  async actionPlan(projectId: string): Promise<ActionPlanResponse> {
    return apiClient.post<ActionPlanResponse>(
      `/ai/projects/${encodeURIComponent(projectId)}/action-plan`,
      {},
    );
  },

  // Aliases for convenience
  getHealthSummary: (projectId: string) => aiApi.healthSummary(projectId),
  getRiskMitigation: (projectId: string) => aiApi.riskMitigation(projectId),
  getWorkloadBalance: (projectId: string) => aiApi.workloadBalance(projectId),
  getBottlenecks: (projectId: string) => aiApi.bottlenecks(projectId),
  simulateScenario: (projectId: string, body: SimulationRequest) =>
    aiApi.simulate(projectId, body),
  getProjectBrief: (projectId: string) => aiApi.brief(projectId),
  queryProject: (projectId: string, queryText: string) =>
    aiApi.query(projectId, queryText),
  getEmergingRisks: (projectId: string) => aiApi.emergingRisks(projectId),
  getDeliveryPrediction: (projectId: string) =>
    aiApi.deliveryPrediction(projectId),
  getActionPlan: (projectId: string) => aiApi.actionPlan(projectId),
};
