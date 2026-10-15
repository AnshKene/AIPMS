import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  NaturalLanguageQueryDto,
  SimulationRequestDto,
  SimulationScenarioType,
} from './dto/ai-request.dto.js';
import {
  ActionPlanItem,
  ActionPlanResponseDto,
  AiAnalysisResponseDto,
  BottleneckAnalysisResponseDto,
  BottleneckItem,
  CascadingBlockerItem,
  DataSufficiencyInfo,
  DeliveryPredictionResponseDto,
  EmergingRiskItem,
  EmergingRisksResponseDto,
  ExplainableSignal,
  NaturalLanguageQueryResponseDto,
  ProjectBriefResponseDto,
  QueryEvidenceItem,
  RiskDeliveryImpact,
  SimulationResponseDto,
  SimulationStateMetrics,
} from './dto/ai-response.dto.js';
import { OllamaService } from './ollama.service.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RawProject {
  id: string;
  name: string;
  status: string;
  owner_id?: string;
}

interface RawTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: string | null;
  team_id?: string | null;
  sprint_id?: string | null;
}

interface RawSprint {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface RawRisk {
  id: string;
  title: string;
  description?: string | null;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  mitigation_plan?: string | null;
  due_date?: string | null;
}

interface RawDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

interface RawTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaService: OllamaService,
  ) {
    const url = this.configService.get<string>('supabase.url') ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey') ?? '';
    this.supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  private readonly clientCache = new Map<string, { client: SupabaseClient; lastUsed: number }>();

  private getSupabaseClient(authHeader?: string): SupabaseClient {
    const trimmed = authHeader ? authHeader.trim() : '';
    if (
      !trimmed ||
      !trimmed.startsWith('Bearer ') ||
      trimmed === 'Bearer' ||
      trimmed.length <= 7
    ) {
      throw new UnauthorizedException(
        'Valid Bearer authorization header is required',
      );
    }

    const token = trimmed.slice(7).trim();
    if (!token || token.split('.').length !== 3) {
      throw new UnauthorizedException(
        'Invalid or malformed Bearer JWT token format',
      );
    }

    const cached = this.clientCache.get(trimmed);
    const now = Date.now();
    if (cached && now - cached.lastUsed < 15 * 60 * 1000) {
      cached.lastUsed = now;
      return cached.client;
    }

    if (this.clientCache.size >= 100) {
      const oldestKey = this.clientCache.keys().next().value;
      if (oldestKey) this.clientCache.delete(oldestKey);
    }

    const url = this.configService.get<string>('supabase.url') ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey') ?? '';
    const client = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: trimmed,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.clientCache.set(trimmed, { client, lastUsed: now });
    return client;
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid project UUID format: '${id}'`);
    }
  }

  private async getAuthorizedProject(
    client: SupabaseClient,
    projectId: string,
  ): Promise<RawProject> {
    const rpcPromise =
      typeof client.rpc === 'function'
        ? client.rpc('aipms_user_has_project_access', { p_project_id: projectId })
        : Promise.resolve({ data: true, error: null });

    const [projectRes, accessRes] = await Promise.all([
      client
        .from('projects')
        .select('id, name, status, owner_id')
        .eq('id', projectId)
        .maybeSingle(),
      rpcPromise,
    ]);

    if (projectRes.error) {
      this.logger.error(
        `Failed to fetch project ${projectId}: ${projectRes.error.message}`,
      );
      const errMsg = projectRes.error.message.toLowerCase();
      if (
        errMsg.includes('jwt') ||
        errMsg.includes('token') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('signature') ||
        errMsg.includes('auth') ||
        projectRes.error.code === 'PGRST301' ||
        projectRes.error.code === '401'
      ) {
        throw new UnauthorizedException(
          'Invalid, expired, or malformed authorization token',
        );
      }
      throw new BadRequestException(projectRes.error.message);
    }
    if (!projectRes.data) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found or not accessible.`,
      );
    }

    if (accessRes && accessRes.data === false) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found or not accessible.`,
      );
    }

    return projectRes.data as RawProject;
  }

  private evaluateDataSufficiency(
    tasks: RawTask[],
    sprints: RawSprint[],
    risks: RawRisk[],
    dependencies: RawDependency[],
    membersCount = 0,
  ): DataSufficiencyInfo {
    const reasons: string[] = [];
    const missingDimensions: string[] = [];
    let completeness = 0;

    const totalTasks = tasks.length;
    const tasksWithDueDate = tasks.filter((t) => !!t.due_date).length;

    // 1. Task Volume (30%)
    if (totalTasks === 0) {
      missingDimensions.push('tasks');
      reasons.push('No tasks recorded in project backlog.');
    } else if (totalTasks === 1) {
      completeness += 10;
      reasons.push('Single task recorded; minimal task sample size for trend analysis.');
    } else if (totalTasks < 5) {
      completeness += 20;
      reasons.push(`Limited task volume (${totalTasks} tasks recorded; >= 5 recommended for statistical confidence).`);
    } else {
      completeness += 30;
    }

    // 2. Sprint Velocity Telemetry (25%)
    const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
    if (!activeSprint) {
      missingDimensions.push('active_sprint');
      reasons.push('No active sprint configured for delivery velocity calculation.');
    } else if (!activeSprint.start_date || !activeSprint.end_date) {
      completeness += 10;
      reasons.push('Active sprint lacks complete start/end timeline boundaries.');
    } else {
      completeness += 25;
    }

    // 3. Due Date Coverage (15%)
    if (totalTasks > 0) {
      const dueDateRatio = tasksWithDueDate / totalTasks;
      completeness += Math.round(dueDateRatio * 15);
      if (dueDateRatio < 0.5) {
        missingDimensions.push('due_dates');
        reasons.push(`Only ${tasksWithDueDate}/${totalTasks} tasks have assigned due dates.`);
      }
    }

    // 4. Dependency Graph Mapping (15%)
    if (dependencies.length === 0) {
      missingDimensions.push('dependencies');
      reasons.push('No task dependency relationships mapped in dependency graph.');
    } else {
      completeness += 15;
    }

    // 5. Risk Assessment (15%)
    if (risks.length === 0) {
      missingDimensions.push('risks');
      reasons.push('No risks registered in project risk registry.');
    } else {
      completeness += 15;
    }

    completeness = Math.max(0, Math.min(100, completeness));

    let level: 'FULL' | 'MODERATE' | 'LOW' | 'MINIMAL' = 'MINIMAL';
    if (completeness >= 70) level = 'FULL';
    else if (completeness >= 45) level = 'MODERATE';
    else if (completeness >= 20) level = 'LOW';

    const sufficient = level === 'FULL' || level === 'MODERATE';

    return {
      sufficient,
      level,
      telemetryCompleteness: completeness,
      reasons,
      missingDimensions,
    };
  }

  // ─── 1. Health Summary & Predictive Trajectory ──────────────────────────────

  async getHealthSummary(
    projectId: string,
    authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    this.validateUuid(projectId);
    const client = this.getSupabaseClient(authHeader);

    const [project, tasksRes, sprintsRes, risksRes] =
      await Promise.all([
        this.getAuthorizedProject(client, projectId),
        client
          .from('tasks')
          .select(
            'id, title, status, priority, due_date, assignee_id, team_id, sprint_id',
          )
          .eq('project_id', projectId),
        client
          .from('sprints')
          .select('id, name, status, start_date, end_date')
          .eq('project_id', projectId),
        client
          .from('risks')
          .select(
            'id, title, description, probability, impact, risk_score, status, mitigation_plan, due_date',
          )
          .eq('project_id', projectId),
      ]);

    if (tasksRes.error) throw new BadRequestException(tasksRes.error.message);
    if (sprintsRes.error)
      throw new BadRequestException(sprintsRes.error.message);
    if (risksRes.error) throw new BadRequestException(risksRes.error.message);
    const tasks: RawTask[] = tasksRes.data ?? [];
    const sprints: RawSprint[] = sprintsRes.data ?? [];
    const risks: RawRisk[] = risksRes.data ?? [];

    const taskIds = tasks.map((t) => t.id);
    let dependencies: RawDependency[] = [];
    if (taskIds.length > 0) {
      const query = client
        .from('task_dependencies')
        .select('id, task_id, depends_on_task_id');
      const depsRes =
        typeof query.in === 'function'
          ? await query.in('task_id', taskIds)
          : await query;
      if (depsRes && depsRes.data) {
        dependencies = depsRes.data;
      }
    }
    const now = new Date();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW',
    ).length;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'DONE',
    ).length;

    const unresolvedRisks = risks.filter(
      (r) =>
        r.status !== 'RESOLVED' &&
        r.status !== 'CLOSED' &&
        r.status !== 'MITIGATED',
    );
    const highRisks = unresolvedRisks.filter((r) => r.risk_score >= 15);
    const mediumRisks = unresolvedRisks.filter(
      (r) => r.risk_score >= 6 && r.risk_score < 15,
    );

    const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
    const activeSprintTasks = activeSprint
      ? tasks.filter((t) => t.sprint_id === activeSprint.id)
      : [];
    const activeSprintDone = activeSprintTasks.filter(
      (t) => t.status === 'DONE',
    ).length;
    const activeSprintTotal = activeSprintTasks.length;

    // Evaluate Deterministic Data Sufficiency
    const dataSufficiency = this.evaluateDataSufficiency(
      tasks,
      sprints,
      risks,
      dependencies,
      0,
    );

    // Delivery Trajectory Calculation
    let deliveryTrajectory:
      | 'ON_TRACK'
      | 'BEHIND_SCHEDULE'
      | 'AT_RISK'
      | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
    let sprintVelocityPace = 0;
    let requiredPace = 0;
    let daysRemainingInSprint = 0;

    if (activeSprint && activeSprint.start_date && activeSprint.end_date) {
      const start = new Date(activeSprint.start_date).getTime();
      const end = new Date(activeSprint.end_date).getTime();
      const current = now.getTime();
      const elapsedDays = Math.max(
        0.5,
        (current - start) / (1000 * 60 * 60 * 24),
      );
      daysRemainingInSprint = Math.max(
        0,
        Math.ceil((end - current) / (1000 * 60 * 60 * 24)),
      );

      sprintVelocityPace = activeSprintDone / elapsedDays;
      const remainingTasks = Math.max(0, activeSprintTotal - activeSprintDone);
      requiredPace =
        daysRemainingInSprint > 0
          ? remainingTasks / daysRemainingInSprint
          : remainingTasks;

      if (activeSprintTotal === 0) {
        deliveryTrajectory = 'INSUFFICIENT_DATA';
      } else if (activeSprintDone === activeSprintTotal) {
        deliveryTrajectory = 'ON_TRACK';
      } else if (daysRemainingInSprint === 0 && remainingTasks > 0) {
        deliveryTrajectory = 'BEHIND_SCHEDULE';
      } else if (sprintVelocityPace >= requiredPace * 0.9) {
        deliveryTrajectory = 'ON_TRACK';
      } else if (sprintVelocityPace >= requiredPace * 0.6) {
        deliveryTrajectory = 'AT_RISK';
      } else {
        deliveryTrajectory = 'BEHIND_SCHEDULE';
      }
    } else if (!dataSufficiency.sufficient && !activeSprint) {
      deliveryTrajectory = 'INSUFFICIENT_DATA';
    } else if (totalTasks > 0) {
      const overdueRatio = overdueTasks / totalTasks;
      if (overdueRatio > 0.3) deliveryTrajectory = 'BEHIND_SCHEDULE';
      else if (overdueRatio > 0.1 || highRisks.length > 0)
        deliveryTrajectory = 'AT_RISK';
      else deliveryTrajectory = 'ON_TRACK';
    }

    // Composite Quantitative Health Score (0–100)
    let healthScore = 100;
    healthScore -= highRisks.length * 15;
    healthScore -= mediumRisks.length * 8;
    healthScore -= overdueTasks * 10;
    healthScore -= blockedTasks * 6;

    if (deliveryTrajectory === 'BEHIND_SCHEDULE') healthScore -= 20;
    else if (deliveryTrajectory === 'AT_RISK') healthScore -= 10;

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus: 'HEALTHY' | 'MODERATE_RISK' | 'AT_RISK' | 'CRITICAL' =
      'HEALTHY';
    if (healthScore < 40) healthStatus = 'CRITICAL';
    else if (healthScore < 60) healthStatus = 'AT_RISK';
    else if (healthScore < 80) healthStatus = 'MODERATE_RISK';

    // Risk Exposure Category
    let riskExposure: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (highRisks.length >= 2) riskExposure = 'CRITICAL';
    else if (highRisks.length === 1 || mediumRisks.length >= 3)
      riskExposure = 'HIGH';
    else if (mediumRisks.length > 0) riskExposure = 'MEDIUM';

    // Dependency Pressure Category
    const projectTaskIds = new Set(tasks.map((t) => t.id));
    const projectDeps = dependencies.filter(
      (d) =>
        projectTaskIds.has(d.task_id) &&
        projectTaskIds.has(d.depends_on_task_id),
    );
    let dependencyPressure: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (blockedTasks >= 3 || projectDeps.length > totalTasks * 1.2) {
      dependencyPressure = 'HIGH';
    } else if (blockedTasks > 0 || projectDeps.length > 0) {
      dependencyPressure = 'MEDIUM';
    }

    // Workload Pressure Category
    const activeTasks = tasks.filter((t) => t.status !== 'DONE');
    const tasksPerAssignee: Record<string, number> = {};
    for (const t of activeTasks) {
      const key = t.assignee_id ?? 'unassigned';
      tasksPerAssignee[key] = (tasksPerAssignee[key] ?? 0) + 1;
    }
    const maxAssigned = Math.max(0, ...Object.values(tasksPerAssignee));
    let workloadPressure: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (maxAssigned >= 6) workloadPressure = 'HIGH';
    else if (maxAssigned >= 3) workloadPressure = 'MEDIUM';

    // Execution Confidence (Grounded in data sufficiency & project volatility)
    let executionConfidence = 85;
    if (dataSufficiency.level === 'MINIMAL') {
      executionConfidence = 30;
    } else if (dataSufficiency.level === 'LOW') {
      executionConfidence = 45;
    } else if (deliveryTrajectory === 'INSUFFICIENT_DATA') {
      executionConfidence = 50;
    } else if (deliveryTrajectory === 'BEHIND_SCHEDULE') {
      executionConfidence = 55;
    } else if (deliveryTrajectory === 'AT_RISK') {
      executionConfidence = 70;
    }
    if (highRisks.length > 0) executionConfidence -= 10;
    executionConfidence = Math.max(25, Math.min(95, executionConfidence));

    // Sprint Stability
    let sprintStability: 'STABLE' | 'VOLATILE' | 'AT_RISK' | 'INSUFFICIENT_DATA' =
      'INSUFFICIENT_DATA';
    if (activeSprint) {
      if (blockedTasks > 1 || overdueTasks > 2) sprintStability = 'AT_RISK';
      else if (overdueTasks > 0 || deliveryTrajectory === 'BEHIND_SCHEDULE')
        sprintStability = 'VOLATILE';
      else sprintStability = 'STABLE';
    }

    // Correlated Risk Delivery Impact
    const riskDeliveryImpact: RiskDeliveryImpact[] = unresolvedRisks.map((r) => {
      let impactCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (r.risk_score >= 15) impactCategory = 'CRITICAL';
      else if (r.risk_score >= 9) impactCategory = 'HIGH';
      else if (r.risk_score >= 6) impactCategory = 'MEDIUM';

      const isSprintAffecting = activeSprint
        ? impactCategory === 'CRITICAL' || impactCategory === 'HIGH'
        : false;

      return {
        riskId: r.id,
        riskTitle: r.title,
        riskScore: r.risk_score,
        deliveryImpact: impactCategory,
        affectedTasksCount: blockedTasks + (r.risk_score >= 12 ? 2 : 1),
        isAffectingActiveSprint: isSprintAffecting,
        mitigationPlan: r.mitigation_plan ?? undefined,
      };
    });

    // Explainable Early Warning Signals
    const signals: ExplainableSignal[] = [];

    if (overdueTasks > 0) {
      signals.push({
        title: 'Overdue Delivery Bottleneck',
        category: 'SCHEDULE',
        severity: overdueTasks >= 3 ? 'HIGH' : 'MEDIUM',
        observation: `${overdueTasks} project tasks have passed their scheduled deadlines without completion.`,
        evidence: [
          `Overdue tasks count: ${overdueTasks}`,
          `Total incomplete tasks: ${totalTasks - completedTasks}`,
          `Current date: ${now.toISOString().split('T')[0]}`,
        ],
        reasoning:
          'Overdue items accumulate schedule debt and directly delay dependent downstream deliverables.',
        recommendation:
          'Audit overdue task blockers immediately, re-estimate remaining work, and adjust assignments.',
        expectedImpact: 'Prevents schedule slippage from compounding across active sprint goals.',
      });
    }

    if (blockedTasks > 0) {
      signals.push({
        title: 'Blocked Task Dependency Chain',
        category: 'BLOCKER',
        severity: blockedTasks >= 2 ? 'CRITICAL' : 'HIGH',
        observation: `${blockedTasks} tasks are currently marked BLOCKED in the project.`,
        evidence: [
          `Blocked tasks: ${blockedTasks}`,
          `Active sprint tasks affected: ${activeSprintTasks.filter((t) => t.status === 'BLOCKED').length}`,
        ],
        reasoning:
          'Blocked tasks pause execution flow and risk starving downstream assignees of prerequisite outputs.',
        recommendation:
          'Prioritize resolving external dependencies or technical impediments on blocked tasks.',
        expectedImpact: 'Restores sprint execution flow and unblocks dependent teammates.',
      });
    }

    if (highRisks.length > 0) {
      signals.push({
        title: 'High-Severity Unresolved Risks',
        category: 'RISK',
        severity: 'CRITICAL',
        observation: `${highRisks.length} unresolved risks have a critical risk score (>= 15).`,
        evidence: highRisks.map((r) => `"${r.title}" (Score: ${r.risk_score})`),
        reasoning:
          'Unmitigated severe risks have a high probability of causing scope truncation or technical failure.',
        recommendation:
          'Activate predefined risk mitigation plans and assign designated risk owners.',
        expectedImpact: 'Reduces likelihood of project disruption and delivery failure.',
      });
    }

    if (activeSprint && deliveryTrajectory === 'BEHIND_SCHEDULE') {
      signals.push({
        title: 'Sprint Velocity Deficit',
        category: 'SCHEDULE',
        severity: 'HIGH',
        observation: `Active sprint "${activeSprint.name}" is tracking behind the required completion pace.`,
        evidence: [
          `Current pace: ${sprintVelocityPace.toFixed(2)} tasks/day`,
          `Required pace: ${requiredPace.toFixed(2)} tasks/day`,
          `Days remaining: ${daysRemainingInSprint}`,
          `Remaining sprint tasks: ${activeSprintTotal - activeSprintDone}`,
        ],
        reasoning:
          'The burnup velocity is insufficient to complete the remaining sprint backlog prior to deadline.',
        recommendation:
          'Consider scope re-negotiation or moving lowest priority tasks to the next sprint backlog.',
        expectedImpact:
          'Protects sprint delivery commitment and avoids last-minute quality compromises.',
      });
    }

    if (!dataSufficiency.sufficient) {
      signals.push({
        title: 'Limited Project Telemetry',
        category: 'SCHEDULE',
        severity: 'INFO',
        observation: `Project telemetry completeness is evaluated at ${dataSufficiency.telemetryCompleteness}% (${dataSufficiency.level}).`,
        evidence: dataSufficiency.reasons,
        reasoning:
          'Statistical trajectory and bottleneck predictions require active sprint velocity and dependency telemetry.',
        recommendation:
          'Add tasks with due dates, map dependency links, and activate a sprint to enable full predictive intelligence.',
        expectedImpact:
          'Unlocks high-confidence health scoring, burndown tracking, and automated early warning signals.',
      });
    }

    // Deterministic Fallback Synthesis
    const fallbackGenerator = () => {
      if (!dataSufficiency.sufficient) {
        return {
          summary: `Project "${project.name}" currently has ${dataSufficiency.level.toLowerCase()} telemetry completeness (${dataSufficiency.telemetryCompleteness}%). Add tasks, dependencies, or an active sprint for full predictive intelligence.`,
          insights: [
            `Total tasks recorded: ${totalTasks}.`,
            ...dataSufficiency.reasons.slice(0, 2),
            `Delivery trajectory is evaluated as ${deliveryTrajectory}.`,
          ],
          recommendations: [
            'Create tasks with target due dates and assignees.',
            'Establish task dependencies to track critical paths.',
            'Create and activate a sprint to track burndown velocity.',
          ],
        };
      }

      const fallbackInsights = [
        `Overall project health is ${healthStatus} (Score: ${healthScore}/100).`,
        `Delivery pace trajectory is currently ${deliveryTrajectory} with ${executionConfidence}% execution confidence.`,
        `Task breakdown: ${completedTasks}/${totalTasks} completed (${blockedTasks} blocked, ${overdueTasks} overdue).`,
      ];
      if (activeSprint) {
        fallbackInsights.push(
          `Active sprint "${activeSprint.name}": ${activeSprintDone}/${activeSprintTotal} tasks done (${daysRemainingInSprint} days remaining).`,
        );
      }
      if (highRisks.length > 0) {
        fallbackInsights.push(
          `${highRisks.length} critical risks require immediate management intervention.`,
        );
      }

      const fallbackRecs: string[] = [];
      if (overdueTasks > 0) {
        fallbackRecs.push(
          `Review and reschedule the ${overdueTasks} overdue task(s) to stabilize timelines.`,
        );
      }
      if (blockedTasks > 0) {
        fallbackRecs.push(
          `Clear impediments on the ${blockedTasks} blocked task(s) to resume execution.`,
        );
      }
      if (highRisks.length > 0) {
        fallbackRecs.push(
          `Execute contingency plans for high-severity risk: "${highRisks[0].title}".`,
        );
      }
      if (fallbackRecs.length === 0) {
        fallbackRecs.push(
          'Maintain current velocity and monitor ongoing task burndown regularly.',
        );
      }

      return {
        summary: `Project "${project.name}" is currently ${healthStatus} with a health score of ${healthScore}/100. Delivery trajectory is evaluated as ${deliveryTrajectory}.`,
        insights: fallbackInsights,
        recommendations: fallbackRecs,
      };
    };

    // User context for Ollama
    const userContext = JSON.stringify({
      projectName: project.name,
      healthScore,
      healthStatus,
      deliveryTrajectory,
      executionConfidence: `${executionConfidence}%`,
      dataSufficiency,
      riskExposure,
      dependencyPressure,
      workloadPressure,
      sprintStability,
      metrics: {
        totalTasks,
        completedTasks,
        blockedTasks,
        overdueTasks,
        inProgressTasks,
        activeSprint: activeSprint
          ? {
              name: activeSprint.name,
              totalTasks: activeSprintTotal,
              doneTasks: activeSprintDone,
              daysRemaining: daysRemainingInSprint,
              paceTasksPerDay: Number(sprintVelocityPace.toFixed(2)),
              requiredPaceTasksPerDay: Number(requiredPace.toFixed(2)),
            }
          : null,
        highSeverityRisks: highRisks.map((r) => ({
          title: r.title,
          score: r.risk_score,
        })),
      },
    });

    const systemPrompt = `Synthesize a concise, fact-first executive project health assessment.
Evaluate the health score (${healthScore}/100), trajectory (${deliveryTrajectory}), data sufficiency (${dataSufficiency.level}), and active constraints.
Do NOT invent numbers or contradict the provided metrics.`;

    const aiContent = await this.ollamaService.generateStructuredAnalysis(
      systemPrompt,
      userContext,
      fallbackGenerator,
    );

    return {
      projectId,
      projectName: project.name,
      analysisType: 'health-summary',
      generatedBy: aiContent.generatedBy,
      healthScore,
      healthStatus,
      deliveryTrajectory,
      executionConfidence,
      riskExposure,
      dependencyPressure,
      workloadPressure,
      sprintStability,
      dataSufficiency,
      summary: aiContent.summary,
      insights: aiContent.insights,
      recommendations: aiContent.recommendations,
      signals,
      riskDeliveryImpact,
      metrics: {
        totalTasks,
        completedTasks,
        blockedTasks,
        overdueTasks,
        inProgressTasks,
        activeSprintDone,
        activeSprintTotal,
        daysRemainingInSprint,
        sprintVelocityPace: Number(sprintVelocityPace.toFixed(2)),
        requiredPace: Number(requiredPace.toFixed(2)),
        unresolvedRisksCount: unresolvedRisks.length,
        highRisksCount: highRisks.length,
        dataSufficiencyLevel: dataSufficiency.level,
        telemetryCompleteness: dataSufficiency.telemetryCompleteness,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 2. Risk Mitigation & Delivery Impact ───────────────────────────────────

  async getRiskMitigation(
    projectId: string,
    authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    this.validateUuid(projectId);
    const client = this.getSupabaseClient(authHeader);

    const [project, risksRes, tasksRes] = await Promise.all([
      this.getAuthorizedProject(client, projectId),
      client
        .from('risks')
        .select(
          'id, title, description, probability, impact, risk_score, status, mitigation_plan, due_date',
        )
        .eq('project_id', projectId),
      client
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('project_id', projectId),
    ]);

    if (risksRes.error) throw new BadRequestException(risksRes.error.message);
    const risks: RawRisk[] = risksRes.data ?? [];
    const tasks: RawTask[] = tasksRes.data ?? [];

    const activeRisks = risks.filter(
      (r) =>
        r.status !== 'RESOLVED' &&
        r.status !== 'CLOSED' &&
        r.status !== 'MITIGATED',
    );
    const highSeverityRisks = activeRisks.filter((r) => r.risk_score >= 6);

    const blockedTasksCount = tasks.filter((t) => t.status === 'BLOCKED').length;

    const riskDeliveryImpact: RiskDeliveryImpact[] = activeRisks.map((r) => {
      let impactCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (r.risk_score >= 15) impactCategory = 'CRITICAL';
      else if (r.risk_score >= 9) impactCategory = 'HIGH';
      else if (r.risk_score >= 6) impactCategory = 'MEDIUM';

      return {
        riskId: r.id,
        riskTitle: r.title,
        riskScore: r.risk_score,
        deliveryImpact: impactCategory,
        affectedTasksCount: blockedTasksCount + (r.risk_score >= 10 ? 2 : 1),
        isAffectingActiveSprint: r.risk_score >= 9,
        mitigationPlan: r.mitigation_plan ?? undefined,
      };
    });

    if (risks.length === 0) {
      return {
        projectId,
        projectName: project.name,
        analysisType: 'risk-mitigation',
        generatedBy: 'deterministic-fallback',
        summary: 'No high-severity risks are currently recorded in the project registry.',
        insights: ['Risk registry is currently empty (0 registered risks).'],
        recommendations: [
          '[Preventive Guidance] Conduct a risk assessment workshop to identify potential technical, dependency, and schedule hazards early.',
          '[Preventive Guidance] Establish risk ownership and contingency trigger criteria before sprint execution.',
        ],
        riskDeliveryImpact: [],
        risks: [],
        metrics: {
          totalRisks: 0,
          activeRisksCount: 0,
          highSeverityRisksCount: 0,
        },
        dataSufficiency: {
          sufficient: false,
          level: 'MINIMAL',
          telemetryCompleteness: 0,
          reasons: ['No risks recorded in project registry.'],
          missingDimensions: ['risks'],
        },
        generatedAt: new Date().toISOString(),
      };
    }

    const fallbackGenerator = () => {
      if (highSeverityRisks.length === 0) {
        return {
          summary: `No high-severity risks are currently recorded for "${project.name}". All registered risks are within normal operational parameters.`,
          insights: [
            `Total tracked risks: ${risks.length} (${activeRisks.length} active).`,
            'All active risks are within acceptable low/moderate severity thresholds (score < 6).',
          ],
          recommendations: [
            '[Preventive Guidance] Continue periodic risk reviews during regular project standups.',
          ],
        };
      }

      const topRisk = highSeverityRisks.reduce((max, r) =>
        r.risk_score > max.risk_score ? r : max,
      );

      return {
        summary: `Identified ${highSeverityRisks.length} high-severity risk(s) requiring proactive mitigation. Highest priority is "${topRisk.title}" with a severity score of ${topRisk.risk_score}/25.`,
        insights: highSeverityRisks.map(
          (r) =>
            `Risk "${r.title}" (Score: ${r.risk_score}/25, Status: ${r.status}): ${
              r.mitigation_plan ? `Plan: ${r.mitigation_plan}` : 'No mitigation plan documented.'
            }`,
        ),
        recommendations: highSeverityRisks.map((r) =>
          r.mitigation_plan
            ? `Execute mitigation plan for "${r.title}": ${r.mitigation_plan}`
            : `Draft and assign an immediate containment plan for "${r.title}".`,
        ),
      };
    };

    const userContext = JSON.stringify({
      projectName: project.name,
      totalRisks: risks.length,
      activeRisksCount: activeRisks.length,
      highSeverityRisks: highSeverityRisks.map((r) => ({
        title: r.title,
        probability: r.probability,
        impact: r.impact,
        score: r.risk_score,
        status: r.status,
        mitigationPlan: r.mitigation_plan,
      })),
      correlatedBlockedTasks: blockedTasksCount,
    });

    const systemPrompt = `Analyze high-severity project risks (score >= 6) and provide concrete containment strategies.
Emphasize practical mitigation steps based only on the provided risk data.
If zero high-severity risks exist, state that clearly and offer only preventive guidance.`;

    const aiContent = await this.ollamaService.generateStructuredAnalysis(
      systemPrompt,
      userContext,
      fallbackGenerator,
    );

    return {
      projectId,
      projectName: project.name,
      analysisType: 'risk-mitigation',
      generatedBy: aiContent.generatedBy,
      summary: aiContent.summary,
      insights: aiContent.insights,
      recommendations: aiContent.recommendations,
      riskDeliveryImpact,
      risks: highSeverityRisks,
      metrics: {
        totalRisks: risks.length,
        activeRisksCount: activeRisks.length,
        highSeverityRisksCount: highSeverityRisks.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 3. Workload Balance & Capacity Optimization ───────────────────────────

  async getWorkloadBalance(
    projectId: string,
    authHeader?: string,
  ): Promise<AiAnalysisResponseDto> {
    this.validateUuid(projectId);
    const client = this.getSupabaseClient(authHeader);

    const [project, tasksRes, teamsRes] = await Promise.all([
      this.getAuthorizedProject(client, projectId),
      client
        .from('tasks')
        .select('id, title, status, priority, due_date, assignee_id, team_id')
        .eq('project_id', projectId),
      client.from('teams').select('id, name').eq('project_id', projectId),
    ]);

    if (tasksRes.error) throw new BadRequestException(tasksRes.error.message);
    const tasks: RawTask[] = tasksRes.data ?? [];
    const teams: { id: string; name: string }[] = teamsRes.data ?? [];
    const teamIds = teams.map((t) => t.id);

    let members: RawTeamMember[] = [];
    if (teamIds.length > 0) {
      const membersRes = await client
        .from('team_members')
        .select('id, team_id, user_id, role')
        .in('team_id', teamIds);
      if (membersRes.data) {
        members = membersRes.data;
      }
    }

    const now = new Date();
    const activeTasks = tasks.filter((t) => t.status !== 'DONE');

    const memberStats: Record<
      string,
      { total: number; active: number; overdue: number; blocked: number }
    > = {};

    for (const m of members) {
      memberStats[m.user_id] = { total: 0, active: 0, overdue: 0, blocked: 0 };
    }

    let unassignedCount = 0;
    for (const t of activeTasks) {
      if (!t.assignee_id) {
        unassignedCount++;
        continue;
      }
      if (!memberStats[t.assignee_id]) {
        memberStats[t.assignee_id] = { total: 0, active: 0, overdue: 0, blocked: 0 };
      }
      memberStats[t.assignee_id].active++;
      memberStats[t.assignee_id].total++;
      if (t.status === 'BLOCKED') memberStats[t.assignee_id].blocked++;
      if (t.due_date && new Date(t.due_date) < now) {
        memberStats[t.assignee_id].overdue++;
      }
    }

    const memberLoads = Object.entries(memberStats).map(([userId, stats]) => ({
      userId,
      ...stats,
    }));

    const overloaded = memberLoads.filter((m) => m.active >= 5 || m.overdue >= 2);
    const underloaded = memberLoads.filter((m) => m.active <= 1);

    const fallbackGenerator = () => {
      const insights: string[] = [
        `Active workload across ${memberLoads.length} team member(s): ${activeTasks.length} active tasks total.`,
      ];
      if (unassignedCount > 0) {
        insights.push(
          `${unassignedCount} active task(s) currently lack an assigned owner.`,
        );
      }
      if (overloaded.length > 0) {
        insights.push(
          `${overloaded.length} team member(s) carry high workload concentrations (>= 5 active or >= 2 overdue).`,
        );
      } else {
        insights.push('Workload distribution is relatively balanced across active members.');
      }

      const recommendations: string[] = [];
      if (unassignedCount > 0) {
        recommendations.push(
          `Assign the ${unassignedCount} unassigned task(s) to team members with available capacity.`,
        );
      }
      if (overloaded.length > 0 && underloaded.length > 0) {
        recommendations.push(
          'Rebalance 1–2 non-critical tasks from overloaded assignees to members with lighter active load.',
        );
      }
      if (recommendations.length === 0) {
        recommendations.push(
          'Maintain current assignments and monitor progress during regular sprint cadence.',
        );
      }

      return {
        summary: `Workload evaluation for "${project.name}" identified ${activeTasks.length} active tasks across ${memberLoads.length} member(s). ${overloaded.length} member(s) flagged for potential overload.`,
        insights,
        recommendations,
      };
    };

    const userContext = JSON.stringify({
      projectName: project.name,
      totalActiveTasks: activeTasks.length,
      unassignedTasks: unassignedCount,
      membersCount: memberLoads.length,
      distribution: memberLoads,
      overloadedCount: overloaded.length,
      underloadedCount: underloaded.length,
    });

    const systemPrompt = `Analyze project team workload distribution and suggest capacity rebalancing actions.
Highlight overload bottlenecks, unassigned work, and capacity optimizations using only the provided facts.`;

    const aiContent = await this.ollamaService.generateStructuredAnalysis(
      systemPrompt,
      userContext,
      fallbackGenerator,
    );

    const workloadPressure =
      overloaded.length > 1
        ? 'HIGH'
        : overloaded.length === 1
        ? 'MEDIUM'
        : 'LOW';

    return {
      projectId,
      projectName: project.name,
      analysisType: 'workload-balance',
      generatedBy: aiContent.generatedBy,
      workloadPressure,
      summary: aiContent.summary,
      insights: aiContent.insights,
      recommendations: aiContent.recommendations,
      metrics: {
        totalActiveTasks: activeTasks.length,
        unassignedTasksCount: unassignedCount,
        trackedMembersCount: memberLoads.length,
        overloadedMembersCount: overloaded.length,
        underloadedMembersCount: underloaded.length,
        memberDistribution: memberLoads,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 4. Bottleneck & Critical Path Graph Intelligence ───────────────────────

  async getBottleneckAnalysis(
    projectId: string,
    authHeader?: string,
  ): Promise<BottleneckAnalysisResponseDto> {
    this.validateUuid(projectId);
    const client = this.getSupabaseClient(authHeader);

    const [project, tasksRes, sprintsRes] = await Promise.all([
      this.getAuthorizedProject(client, projectId),
      client
        .from('tasks')
        .select('id, title, status, priority, due_date, sprint_id')
        .eq('project_id', projectId),
      client
        .from('sprints')
        .select('id, name, status')
        .eq('project_id', projectId)
        .eq('status', 'ACTIVE')
        .maybeSingle(),
    ]);

    if (tasksRes.error) throw new BadRequestException(tasksRes.error.message);

    const tasks: RawTask[] = tasksRes.data ?? [];
    const activeSprint = sprintsRes.data;

    const taskIds = tasks.map((t) => t.id);
    let rawDeps: RawDependency[] = [];
    if (taskIds.length > 0) {
      const query = client
        .from('task_dependencies')
        .select('id, task_id, depends_on_task_id');
      const depsRes =
        typeof query.in === 'function'
          ? await query.in('task_id', taskIds)
          : await query;
      if (depsRes && depsRes.error) throw new BadRequestException(depsRes.error.message);
      rawDeps = depsRes?.data ?? [];
    }

    const taskMap = new Map<string, RawTask>(tasks.map((t) => [t.id, t]));
    const projectTaskIds = new Set(tasks.map((t) => t.id));

    // Filter project-scoped dependencies
    const validDeps = rawDeps.filter(
      (d) =>
        projectTaskIds.has(d.task_id) &&
        projectTaskIds.has(d.depends_on_task_id),
    );

    // Build Adjacency Lists: depends_on_task_id -> [task_id]
    const downstreamMap = new Map<string, string[]>();
    const inDegreeMap = new Map<string, number>();

    for (const t of tasks) {
      downstreamMap.set(t.id, []);
      inDegreeMap.set(t.id, 0);
    }

    for (const d of validDeps) {
      downstreamMap.get(d.depends_on_task_id)?.push(d.task_id);
      inDegreeMap.set(d.task_id, (inDegreeMap.get(d.task_id) ?? 0) + 1);
    }

    // Detect Cycles via Kahn's Algorithm
    const queue: string[] = [];
    const tempInDegree = new Map(inDegreeMap);
    for (const [taskId, inDeg] of tempInDegree.entries()) {
      if (inDeg === 0) queue.push(taskId);
    }

    let visitedCount = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      visitedCount++;
      for (const next of downstreamMap.get(curr) ?? []) {
        tempInDegree.set(next, (tempInDegree.get(next) ?? 1) - 1);
        if (tempInDegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }
    const hasCycles = visitedCount < tasks.length && validDeps.length > 0;

    // Transitive Downstream Closure
    const getTransitiveDownstream = (startId: string): Set<string> => {
      const visited = new Set<string>();
      const stack = [...(downstreamMap.get(startId) ?? [])];
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (!visited.has(id)) {
          visited.add(id);
          for (const next of downstreamMap.get(id) ?? []) {
            if (!visited.has(next)) stack.push(next);
          }
        }
      }
      return visited;
    };

    // Find Longest Sequential Chain
    let longestChainTitles: string[] = [];
    const memoPath = new Map<string, string[]>();

    const findLongestFrom = (currId: string, visited: Set<string>): string[] => {
      if (memoPath.has(currId)) return memoPath.get(currId)!;
      if (visited.has(currId)) return [taskMap.get(currId)?.title ?? currId];

      visited.add(currId);
      let maxSub: string[] = [];
      for (const next of downstreamMap.get(currId) ?? []) {
        const sub = findLongestFrom(next, new Set(visited));
        if (sub.length > maxSub.length) maxSub = sub;
      }

      const result = [taskMap.get(currId)?.title ?? currId, ...maxSub];
      memoPath.set(currId, result);
      return result;
    };

    for (const t of tasks) {
      const chain = findLongestFrom(t.id, new Set());
      if (chain.length > longestChainTitles.length) {
        longestChainTitles = chain;
      }
    }

    const now = new Date();
    const bottlenecks: BottleneckItem[] = [];
    const cascadingBlockers: CascadingBlockerItem[] = [];

    for (const t of tasks) {
      const direct = downstreamMap.get(t.id) ?? [];
      const transitive = getTransitiveDownstream(t.id);
      const isBlocked = t.status === 'BLOCKED';
      const isOverdue = !!(t.due_date && new Date(t.due_date) < now && t.status !== 'DONE');

      const affectedSprintTasks = activeSprint
        ? Array.from(transitive).filter(
            (id) => taskMap.get(id)?.sprint_id === activeSprint.id,
          ).length
        : 0;

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if ((isBlocked || isOverdue) && (transitive.size >= 3 || affectedSprintTasks >= 2)) {
        severity = 'CRITICAL';
      } else if ((isBlocked || isOverdue) && transitive.size >= 1) {
        severity = 'HIGH';
      } else if (transitive.size >= 3) {
        severity = 'MEDIUM';
      }

      if (direct.length > 0 || isBlocked) {
        bottlenecks.push({
          taskId: t.id,
          taskTitle: t.title,
          status: t.status,
          priority: t.priority,
          isBlockedOrOverdue: isBlocked || isOverdue,
          directDownstreamCount: direct.length,
          transitiveDownstreamCount: transitive.size,
          affectedSprintTasksCount: affectedSprintTasks,
          impactSeverity: severity,
        });
      }

      if ((isBlocked || isOverdue) && direct.length > 0) {
        cascadingBlockers.push({
          blockerTaskId: t.id,
          blockerTitle: t.title,
          blockedTasksCount: transitive.size,
          blockedTaskTitles: Array.from(transitive)
            .map((id) => taskMap.get(id)?.title ?? id)
            .slice(0, 4),
          sprintImpact:
            affectedSprintTasks > 0
              ? `Directly impacts ${affectedSprintTasks} task(s) in active sprint`
              : 'Affects non-sprint backlog tasks',
        });
      }
    }

    bottlenecks.sort((a, b) => b.transitiveDownstreamCount - a.transitiveDownstreamCount);

    let dependencyPressure: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (cascadingBlockers.length >= 2 || validDeps.length > tasks.length * 1.5) {
      dependencyPressure = 'HIGH';
    } else if (cascadingBlockers.length > 0 || validDeps.length > 0) {
      dependencyPressure = 'MEDIUM';
    }

    const fallbackRecommendations: string[] = [];
    if (cascadingBlockers.length > 0) {
      fallbackRecommendations.push(
        `Resolve top cascading blocker "${cascadingBlockers[0].blockerTitle}" to unblock ${cascadingBlockers[0].blockedTasksCount} downstream task(s).`,
      );
    }
    if (hasCycles) {
      fallbackRecommendations.push(
        'Circular dependency detected in graph. Remove redundant dependency links to prevent deadlock.',
      );
    }
    if (longestChainTitles.length > 3) {
      fallbackRecommendations.push(
        `Longest dependency path spans ${longestChainTitles.length} sequential tasks. Review opportunities to parallelize work.`,
      );
    }
    if (fallbackRecommendations.length === 0) {
      fallbackRecommendations.push(
        'Dependency graph is healthy with minimal sequential blocking pressure.',
      );
    }

    return {
      projectId,
      projectName: project.name,
      totalTasks: tasks.length,
      dependencyCount: validDeps.length,
      dependencyPressure,
      hasCycles,
      longestDependencyChain: longestChainTitles,
      bottlenecks: bottlenecks.slice(0, 10),
      cascadingBlockers,
      recommendations: fallbackRecommendations,
      generatedBy: 'deterministic-fallback',
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 5. What-If Project Simulator ───────────────────────────────────────────

  async simulateScenario(
    projectId: string,
    dto: SimulationRequestDto,
    authHeader?: string,
  ): Promise<SimulationResponseDto> {
    this.validateUuid(projectId);
    const client = this.getSupabaseClient(authHeader);

    const [project, tasksRes, sprintsRes, risksRes] = await Promise.all([
      this.getAuthorizedProject(client, projectId),
      client
        .from('tasks')
        .select(
          'id, title, status, priority, due_date, assignee_id, team_id, sprint_id',
        )
        .eq('project_id', projectId),
      client
        .from('sprints')
        .select('id, name, status, start_date, end_date')
        .eq('project_id', projectId),
      client
        .from('risks')
        .select('id, title, probability, impact, risk_score, status')
        .eq('project_id', projectId),
    ]);

    if (tasksRes.error) throw new BadRequestException(tasksRes.error.message);
    if (sprintsRes.error) throw new BadRequestException(sprintsRes.error.message);
    if (risksRes.error) throw new BadRequestException(risksRes.error.message);

    const tasks: RawTask[] = tasksRes.data ?? [];
    const sprints: RawSprint[] = sprintsRes.data ?? [];
    const risks: RawRisk[] = risksRes.data ?? [];
    const now = new Date();

    const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

    // Baseline Calculator
    const calculateState = (
      taskList: RawTask[],
      riskList: RawRisk[],
      sprintDeadlineExtensionDays = 0,
    ): SimulationStateMetrics => {
      const total = taskList.length;
      const completed = taskList.filter((t) => t.status === 'DONE').length;
      const blocked = taskList.filter((t) => t.status === 'BLOCKED').length;
      const overdue = taskList.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'DONE',
      ).length;
      const unmitigated = riskList.filter(
        (r) =>
          r.status !== 'RESOLVED' &&
          r.status !== 'CLOSED' &&
          r.status !== 'MITIGATED',
      );
      const highRisks = unmitigated.filter((r) => r.risk_score >= 15);
      const medRisks = unmitigated.filter(
        (r) => r.risk_score >= 6 && r.risk_score < 15,
      );

      const sprintTasks = activeSprint
        ? taskList.filter((t) => t.sprint_id === activeSprint.id)
        : [];
      const sprintDone = sprintTasks.filter((t) => t.status === 'DONE').length;

      let trajectory:
        | 'ON_TRACK'
        | 'BEHIND_SCHEDULE'
        | 'AT_RISK'
        | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';

      if (activeSprint && activeSprint.start_date && activeSprint.end_date) {
        const start = new Date(activeSprint.start_date).getTime();
        const end =
          new Date(activeSprint.end_date).getTime() +
          sprintDeadlineExtensionDays * 24 * 60 * 60 * 1000;
        const current = now.getTime();
        const elapsedDays = Math.max(
          0.5,
          (current - start) / (1000 * 60 * 60 * 24),
        );
        const daysRemaining = Math.max(
          0,
          Math.ceil((end - current) / (1000 * 60 * 60 * 24)),
        );

        const velocity = sprintDone / elapsedDays;
        const remaining = Math.max(0, sprintTasks.length - sprintDone);
        const reqPace = daysRemaining > 0 ? remaining / daysRemaining : remaining;

        if (sprintTasks.length === 0) trajectory = 'INSUFFICIENT_DATA';
        else if (sprintDone === sprintTasks.length) trajectory = 'ON_TRACK';
        else if (daysRemaining === 0 && remaining > 0) trajectory = 'BEHIND_SCHEDULE';
        else if (velocity >= reqPace * 0.9) trajectory = 'ON_TRACK';
        else if (velocity >= reqPace * 0.6) trajectory = 'AT_RISK';
        else trajectory = 'BEHIND_SCHEDULE';
      } else if (total > 0) {
        trajectory = overdue / total > 0.2 ? 'BEHIND_SCHEDULE' : 'ON_TRACK';
      }

      let score = 100;
      score -= highRisks.length * 15;
      score -= medRisks.length * 8;
      score -= overdue * 10;
      score -= blocked * 6;
      if (trajectory === 'BEHIND_SCHEDULE') score -= 20;
      else if (trajectory === 'AT_RISK') score -= 10;
      score = Math.max(0, Math.min(100, score));

      let status: 'HEALTHY' | 'MODERATE_RISK' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
      if (score < 40) status = 'CRITICAL';
      else if (score < 60) status = 'AT_RISK';
      else if (score < 80) status = 'MODERATE_RISK';

      return {
        healthScore: score,
        healthStatus: status,
        deliveryTrajectory: trajectory,
        overdueTasks: overdue,
        highSeverityRisks: highRisks.length,
        blockedTasks: blocked,
        activeSprintTasks: sprintTasks.length,
      };
    };

    const baseline = calculateState(tasks, risks);

    // Apply Hypothetical Simulation
    let simulatedTasks = tasks.map((t) => ({ ...t }));
    let simulatedRisks = risks.map((r) => ({ ...r }));
    let extensionDays = 0;
    let scenarioDescription = '';
    const defaultTradeOffs: string[] = [];

    switch (dto.scenario) {
      case SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT:
        scenarioDescription = `Simulate moving all overdue tasks out of current sprint backlog into next sprint cycle.`;
        simulatedTasks = simulatedTasks.map((t) => {
          if (t.due_date && new Date(t.due_date) < now && t.status !== 'DONE') {
            return { ...t, sprint_id: null, due_date: null };
          }
          return t;
        });
        defaultTradeOffs.push(
          'Reduces active sprint overdue pressure immediately.',
          'Increases workload and commitment scope for the subsequent sprint.',
        );
        break;

      case SimulationScenarioType.RESOLVE_HIGH_RISKS:
        scenarioDescription = `Simulate successfully resolving all high-severity risks (score >= 6).`;
        simulatedRisks = simulatedRisks.map((r) => {
          if (dto.riskIds && dto.riskIds.length > 0) {
            return dto.riskIds.includes(r.id) ? { ...r, status: 'RESOLVED' } : r;
          }
          return r.risk_score >= 6 ? { ...r, status: 'RESOLVED' } : r;
        });
        defaultTradeOffs.push(
          'Eliminates major risk penalties from composite health score.',
          'Requires allocating team engineering hours to risk mitigation actions.',
        );
        break;

      case SimulationScenarioType.EXTEND_SPRINT_DEADLINE:
        if (!activeSprint) {
          throw new BadRequestException(
            'Scenario unavailable: No active sprint exists.',
          );
        }
        extensionDays = dto.extendDays ?? 5;
        scenarioDescription = `Simulate extending current sprint deadline by ${extensionDays} calendar days.`;
        defaultTradeOffs.push(
          `Lowers required daily velocity from current pace to accommodate remaining scope.`,
          `Delays downstream release milestone date by ${extensionDays} days.`,
        );
        break;

      case SimulationScenarioType.MOVE_TASKS_TO_NEXT_SPRINT: {
        const moveIds = new Set(dto.taskIds ?? []);
        scenarioDescription = `Simulate deselecting ${moveIds.size} specified task(s) from the active sprint.`;
        simulatedTasks = simulatedTasks.map((t) =>
          moveIds.has(t.id) ? { ...t, sprint_id: null } : t,
        );
        defaultTradeOffs.push(
          `Decreases sprint backlog scope and improves delivery trajectory.`,
          `Pushes ${moveIds.size} deliverable(s) into future planning milestones.`,
        );
        break;
      }

      case SimulationScenarioType.REASSIGN_WORKLOAD: {
        scenarioDescription = `Simulate rebalancing active tasks from overloaded assignees across available capacity.`;
        const activeTasks = simulatedTasks.filter((t) => t.status !== 'DONE');
        const tasksByAssignee: Record<string, RawTask[]> = {};
        for (const t of activeTasks) {
          const k = t.assignee_id ?? 'unassigned';
          if (!tasksByAssignee[k]) tasksByAssignee[k] = [];
          tasksByAssignee[k].push(t);
        }
        let reallocated = 0;
        const targetAssignee = dto.targetAssigneeId ?? 'balanced-member';
        for (const [, memberTasks] of Object.entries(tasksByAssignee)) {
          if (memberTasks.length > 3) {
            const excess = memberTasks.slice(3);
            for (const taskToMove of excess) {
              simulatedTasks = simulatedTasks.map((t) =>
                t.id === taskToMove.id ? { ...t, assignee_id: targetAssignee } : t,
              );
              reallocated++;
            }
          }
        }
        defaultTradeOffs.push(
          `Reallocates ${reallocated} task(s) from concentrated assignees to balance workload pressure.`,
          'Requires onboarding time for team members receiving reassigned work items.',
        );
        break;
      }

      default:
        scenarioDescription = dto.customDescription ?? 'Custom hypothetical simulation scenario';
        defaultTradeOffs.push('Hypothetical state modification without database persistence.');
    }

    const simulated = calculateState(simulatedTasks, simulatedRisks, extensionDays);

    const delta = {
      healthScoreDelta: simulated.healthScore - baseline.healthScore,
      overdueTasksDelta: simulated.overdueTasks - baseline.overdueTasks,
      highSeverityRisksDelta: simulated.highSeverityRisks - baseline.highSeverityRisks,
      blockedTasksDelta: simulated.blockedTasks - baseline.blockedTasks,
    };

    const fallbackGenerator = () => {
      const recs: string[] = [];
      if (delta.healthScoreDelta > 0) {
        recs.push(
          `Applying this scenario improves project health score by +${delta.healthScoreDelta} pts (from ${baseline.healthScore} to ${simulated.healthScore}).`,
        );
      } else if (baseline.healthScore === 100 && extensionDays > 0) {
        recs.push(
          `Baseline schedule is already optimal (100/100). Extending the sprint adds a ${extensionDays}-day buffer without changing health score, though it shifts final delivery milestone.`,
        );
      } else if (delta.healthScoreDelta === 0 && delta.overdueTasksDelta === 0 && delta.highSeverityRisksDelta === 0) {
        recs.push(
          'Scenario produces no measurable numerical delta against current baseline because target conditions (e.g. overdue tasks or high risks) are not present in current project state.',
        );
      } else {
        recs.push('Scenario yields no significant composite health score improvement.');
      }
      recs.push('Review team consensus and stakeholder expectations before applying persistent adjustments.');

      return {
        tradeOffs: defaultTradeOffs,
        recommendations: recs,
      };
    };

    const userContext = JSON.stringify({
      projectName: project.name,
      scenario: dto.scenario,
      scenarioDescription,
      baseline,
      simulated,
      delta,
    });

    const aiSynthesis = await this.ollamaService.generateSimulationSynthesis(
      scenarioDescription,
      userContext,
      fallbackGenerator,
    );

    return {
      projectId,
      isSimulation: true,
      disclaimer: 'SIMULATION ONLY: No persistent changes made to project database.',
      scenario: dto.scenario,
      scenarioDescription,
      baseline,
      simulated,
      delta,
      tradeOffs: aiSynthesis.tradeOffs,
      recommendations: aiSynthesis.recommendations,
      dataSufficiency: this.evaluateDataSufficiency(tasks, sprints, risks, [], 0),
      generatedBy: aiSynthesis.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 6. Executive Project Brief Generator ───────────────────────────────────

  async getProjectBrief(
    projectId: string,
    authHeader?: string,
  ): Promise<ProjectBriefResponseDto> {
    this.validateUuid(projectId);
    const healthSummary = await this.getHealthSummary(projectId, authHeader);
    const bottleneckAnalysis = await this.getBottleneckAnalysis(projectId, authHeader);

    const totalTasks = Number(healthSummary.metrics?.totalTasks ?? 0);
    const completedTasks = Number(healthSummary.metrics?.completedTasks ?? 0);
    const overdueTasks = Number(healthSummary.metrics?.overdueTasks ?? 0);
    const blockedTasks = Number(healthSummary.metrics?.blockedTasks ?? 0);
    const unresolvedRisksCount = Number(healthSummary.metrics?.unresolvedRisksCount ?? 0);
    const dataSufficiency = healthSummary.dataSufficiency;

    const fallbackGenerator = () => {
      const whatIsGoingWell: string[] = [];
      const whatNeedsAttention: string[] = [];
      const topDeliveryRisks: string[] = [];

      if (completedTasks > 0) {
        whatIsGoingWell.push(
          `Completed ${completedTasks} out of ${totalTasks} total tasks (${Math.round((completedTasks / Math.max(1, totalTasks)) * 100)}% progress).`,
        );
      } else if (totalTasks > 0) {
        whatIsGoingWell.push('Project tasks initialized and actively tracked across workspace.');
      } else {
        whatIsGoingWell.push('Project workspace securely initialized with isolated team access.');
      }

      if (dataSufficiency && !dataSufficiency.sufficient) {
        whatNeedsAttention.push(
          `Telemetry is ${dataSufficiency.level.toLowerCase()} (${dataSufficiency.telemetryCompleteness}%). Add tasks, due dates, or an active sprint for full analytics.`,
        );
      }

      if (overdueTasks > 0) {
        whatNeedsAttention.push(
          `${overdueTasks} tasks are past their due date requiring schedule realignment.`,
        );
      }
      if (blockedTasks > 0) {
        whatNeedsAttention.push(
          `${blockedTasks} tasks are currently blocked awaiting dependency resolution.`,
        );
      }

      if (unresolvedRisksCount === 0) {
        topDeliveryRisks.push('No unresolved risks recorded in project risk registry.');
      } else {
        const highImpact = (healthSummary.riskDeliveryImpact ?? [])
          .filter((r) => r.deliveryImpact === 'CRITICAL' || r.deliveryImpact === 'HIGH');
        if (highImpact.length > 0) {
          topDeliveryRisks.push(
            ...highImpact.map((r) => `"${r.riskTitle}" (Severity: ${r.riskScore}, Impact: ${r.deliveryImpact})`),
          );
        } else {
          topDeliveryRisks.push('All registered risks are currently within low/moderate thresholds.');
        }
      }

      return {
        executiveSummary: `Executive Brief for ${healthSummary.projectName ?? 'Project'}: Overall status is ${healthSummary.healthStatus} (${healthSummary.healthScore}/100) with delivery trajectory ${healthSummary.deliveryTrajectory} (${healthSummary.executionConfidence}% confidence).`,
        whatIsGoingWell,
        whatNeedsAttention: whatNeedsAttention.length > 0 ? whatNeedsAttention : ['No immediate operational impediments detected.'],
        criticalBottlenecks: bottleneckAnalysis.cascadingBlockers.length > 0
          ? bottleneckAnalysis.cascadingBlockers.map(
              (b) => `Blocker: "${b.blockerTitle}" affecting ${b.blockedTasksCount} downstream task(s).`,
            )
          : ['No cascading dependency bottlenecks identified.'],
        topDeliveryRisks,
        actionPlan: healthSummary.recommendations,
      };
    };

    const userContext = JSON.stringify({
      projectName: healthSummary.projectName,
      healthScore: healthSummary.healthScore,
      healthStatus: healthSummary.healthStatus,
      deliveryTrajectory: healthSummary.deliveryTrajectory,
      executionConfidence: healthSummary.executionConfidence,
      dataSufficiency,
      metrics: healthSummary.metrics,
      signals: healthSummary.signals,
      bottlenecks: bottleneckAnalysis.cascadingBlockers,
      topRisks: healthSummary.riskDeliveryImpact,
    });

    const brief = await this.ollamaService.generateProjectBrief(
      userContext,
      fallbackGenerator,
    );

    return {
      projectId,
      projectName: healthSummary.projectName,
      executiveSummary: brief.executiveSummary,
      whatIsGoingWell: brief.whatIsGoingWell,
      whatNeedsAttention: brief.whatNeedsAttention,
      criticalBottlenecks: brief.criticalBottlenecks,
      topDeliveryRisks: brief.topDeliveryRisks,
      actionPlan: brief.actionPlan,
      metricsSnapshot: healthSummary.metrics ?? {},
      dataSufficiency,
      generatedBy: brief.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 7. Safe Natural Language Project Query ─────────────────────────────────

  async queryProject(
    projectId: string,
    dto: NaturalLanguageQueryDto,
    authHeader?: string,
  ): Promise<NaturalLanguageQueryResponseDto> {
    this.validateUuid(projectId);
    const query = dto.query.trim().toLowerCase();

    // Intent Recognition Pipeline
    let detectedIntent:
      | 'PROJECT_HEALTH'
      | 'BLOCKERS'
      | 'RISKS'
      | 'WORKLOAD'
      | 'SPRINT_STATUS'
      | 'RECOMMENDATIONS'
      | 'SIMULATION_HELP'
      | 'UNSUPPORTED' = 'UNSUPPORTED';

    if (
      query.includes('block') ||
      query.includes('depend') ||
      query.includes('bottleneck') ||
      query.includes('stuck') ||
      query.includes('critical') ||
      query.includes('path')
    ) {
      detectedIntent = 'BLOCKERS';
    } else if (
      query.includes('risk') ||
      query.includes('threat') ||
      query.includes('mitigat') ||
      query.includes('severity')
    ) {
      detectedIntent = 'RISKS';
    } else if (
      query.includes('workload') ||
      query.includes('team') ||
      query.includes('assign') ||
      query.includes('who') ||
      query.includes('capacity') ||
      query.includes('overload')
    ) {
      detectedIntent = 'WORKLOAD';
    } else if (
      query.includes('sprint') ||
      query.includes('velocity') ||
      query.includes('deadline') ||
      query.includes('pace') ||
      query.includes('trajectory') ||
      query.includes('schedule')
    ) {
      detectedIntent = 'SPRINT_STATUS';
    } else if (
      query.includes('recommend') ||
      query.includes('action') ||
      query.includes('today') ||
      query.includes('suggest') ||
      query.includes('priorit')
    ) {
      detectedIntent = 'RECOMMENDATIONS';
    } else if (
      query.includes('what if') ||
      query.includes('simulate') ||
      query.includes('extend') ||
      query.includes('hypothetical')
    ) {
      detectedIntent = 'SIMULATION_HELP';
    } else if (
      query.includes('health') ||
      query.includes('score') ||
      query.includes('status') ||
      query.includes('overview') ||
      query.includes('why') ||
      query.includes('overdue')
    ) {
      detectedIntent = 'PROJECT_HEALTH';
    }

    // Extract Relevant Facts Based on Intent
    const healthSummary = await this.getHealthSummary(projectId, authHeader);
    const evidence: QueryEvidenceItem[] = [];

    let fallbackAnswer = '';
    let suggestedQuestions: string[] = [];

    const totalTasks = Number(healthSummary.metrics?.totalTasks ?? 0);
    const blockedTasks = Number(healthSummary.metrics?.blockedTasks ?? 0);
    const overdueTasks = Number(healthSummary.metrics?.overdueTasks ?? 0);
    const unresolvedRisksCount = Number(healthSummary.metrics?.unresolvedRisksCount ?? 0);

    switch (detectedIntent) {
      case 'BLOCKERS': {
        const bottlenecks = await this.getBottleneckAnalysis(projectId, authHeader);
        evidence.push(
          {
            metric: 'Total Blocked Tasks',
            value: blockedTasks,
            source: 'tasks',
          },
          {
            metric: 'Cascading Blockers',
            value: bottlenecks.cascadingBlockers.length,
            source: 'task_dependencies',
          },
          {
            metric: 'Dependency Pressure',
            value: bottlenecks.dependencyPressure,
            source: 'task_graph',
          },
        );
        if (bottlenecks.cascadingBlockers.length > 0) {
          evidence.push({
            metric: 'Top Cascading Blocker',
            value: bottlenecks.cascadingBlockers[0].blockerTitle,
            source: 'task_dependencies',
          });
        }
        if (bottlenecks.longestDependencyChain.length > 0) {
          evidence.push({
            metric: 'Critical Path Chain',
            value: bottlenecks.longestDependencyChain.join(' -> '),
            source: 'task_graph',
          });
        }

        if (bottlenecks.cascadingBlockers.length === 0 && blockedTasks === 0) {
          fallbackAnswer = `There is no recorded evidence of active dependency blockers or blocked tasks in this project. All ${totalTasks} task(s) are currently unconstrained by dependency prerequisites.`;
        } else {
          const blockerName =
            bottlenecks.cascadingBlockers[0]?.blockerTitle ?? 'Internal blocked task';
          fallbackAnswer = `The project currently has ${blockedTasks} blocked task(s) and ${bottlenecks.cascadingBlockers.length} cascading dependency bottleneck(s). Top blocker: "${blockerName}". Overall dependency pressure is ${bottlenecks.dependencyPressure}.`;
        }

        suggestedQuestions = [
          'Which tasks are on the critical path?',
          'Which risks threaten our sprint?',
          'What should we prioritize today?',
        ];
        break;
      }

      case 'RISKS': {
        const highRisks = (healthSummary.riskDeliveryImpact ?? []).filter(
          (r) => r.deliveryImpact === 'CRITICAL' || r.deliveryImpact === 'HIGH',
        );
        evidence.push(
          {
            metric: 'Unresolved Risks',
            value: unresolvedRisksCount,
            source: 'risks',
          },
          {
            metric: 'High Severity Risks (Score >= 6)',
            value: highRisks.length,
            source: 'risks',
          },
        );
        if (highRisks.length > 0) {
          evidence.push({
            metric: 'Top Delivery Threat',
            value: highRisks[0].riskTitle,
            source: 'risks',
          });
        }

        if (unresolvedRisksCount === 0) {
          fallbackAnswer = `No unresolved risks are currently recorded in the project risk registry.`;
        } else if (highRisks.length === 0) {
          fallbackAnswer = `There are ${unresolvedRisksCount} active risk(s) recorded, but all are within low/moderate severity thresholds.`;
        } else {
          fallbackAnswer = `There are ${unresolvedRisksCount} active risk(s), with ${highRisks.length} carrying high/critical delivery impact. Top threat: "${highRisks[0].riskTitle}" (Severity: ${highRisks[0].riskScore}).`;
        }

        suggestedQuestions = [
          'What are the mitigation strategies for high-severity risks?',
          'What is blocking this project?',
          'What should we prioritize today?',
        ];
        break;
      }

      case 'WORKLOAD': {
        evidence.push(
          {
            metric: 'Total Active Tasks',
            value: Number(healthSummary.metrics?.inProgressTasks ?? 0),
            source: 'tasks',
          },
          {
            metric: 'Workload Pressure',
            value: healthSummary.workloadPressure ?? 'LOW',
            source: 'teams',
          },
        );
        if (totalTasks === 0) {
          fallbackAnswer = 'Insufficient team workload telemetry: No tasks are currently recorded in this project.';
        } else {
          fallbackAnswer = `Workload pressure is evaluated as ${healthSummary.workloadPressure ?? 'LOW'}. Active tasks are allocated across project assignees.`;
        }
        suggestedQuestions = [
          'What should we prioritize today?',
          'Which tasks are overdue?',
          'What is our current delivery trajectory?',
        ];
        break;
      }

      case 'SPRINT_STATUS': {
        evidence.push(
          {
            metric: 'Delivery Trajectory',
            value: healthSummary.deliveryTrajectory ?? 'INSUFFICIENT_DATA',
            source: 'sprints',
          },
          {
            metric: 'Days Remaining in Sprint',
            value: Number(healthSummary.metrics?.daysRemainingInSprint ?? 0),
            source: 'sprints',
          },
          {
            metric: 'Observed Daily Pace',
            value: `${String(healthSummary.metrics?.sprintVelocityPace ?? 0)} tasks/day`,
            source: 'sprints',
          },
        );
        fallbackAnswer = `Active sprint trajectory is tracking ${healthSummary.deliveryTrajectory} with ${String(healthSummary.metrics?.daysRemainingInSprint ?? 0)} days remaining. Observed pace is ${String(healthSummary.metrics?.sprintVelocityPace ?? 0)} tasks/day vs ${String(healthSummary.metrics?.requiredPace ?? 0)} required.`;
        suggestedQuestions = [
          'What if we extend the sprint deadline by 5 days?',
          'What is blocking this project?',
          'What should we prioritize today?',
        ];
        break;
      }

      case 'RECOMMENDATIONS': {
        evidence.push(
          {
            metric: 'Health Status',
            value: healthSummary.healthStatus ?? 'HEALTHY',
            source: 'health_engine',
          },
          {
            metric: 'Overdue Tasks',
            value: overdueTasks,
            source: 'tasks',
          },
          {
            metric: 'Blocked Tasks',
            value: blockedTasks,
            source: 'tasks',
          },
        );

        if (totalTasks === 0) {
          fallbackAnswer = 'No tasks are currently recorded in this project to prioritize. Recommended first step: Create project tasks with assignees and due dates.';
        } else if (overdueTasks > 0 || blockedTasks > 0) {
          fallbackAnswer = `Top priority: Address the ${blockedTasks} blocked task(s) and resolve/reschedule the ${overdueTasks} overdue item(s) to stabilize sprint velocity.`;
        } else {
          fallbackAnswer = `Top priority: Continue executing active sprint deliverables according to schedule milestones.`;
        }

        suggestedQuestions = [
          'What is blocking this project?',
          'Which risks threaten our sprint?',
          'Which tasks are overdue?',
        ];
        break;
      }

      case 'SIMULATION_HELP': {
        evidence.push({
          metric: 'Current Health Score',
          value: Number(healthSummary.healthScore ?? 100),
          source: 'simulation_engine',
        });
        fallbackAnswer = `You can run hypothetical what-if simulations to project how moving tasks, extending sprint deadlines, or resolving risks impacts health score and delivery trajectory without altering database state.`;
        suggestedQuestions = [
          'Simulate moving overdue tasks to next sprint',
          'Simulate resolving high-severity risks',
          'Simulate extending sprint deadline by 5 days',
        ];
        break;
      }

      case 'PROJECT_HEALTH': {
        evidence.push(
          {
            metric: 'Health Score',
            value: `${String(healthSummary.healthScore)}/100`,
            source: 'health_engine',
          },
          {
            metric: 'Health Status',
            value: healthSummary.healthStatus ?? 'HEALTHY',
            source: 'health_engine',
          },
          {
            metric: 'Delivery Trajectory',
            value: healthSummary.deliveryTrajectory ?? 'ON_TRACK',
            source: 'health_engine',
          },
          {
            metric: 'Overdue Tasks',
            value: overdueTasks,
            source: 'tasks',
          },
        );
        fallbackAnswer = `Project is ${healthSummary.healthStatus} (${String(healthSummary.healthScore)}/100). Delivery trajectory is ${healthSummary.deliveryTrajectory} (${healthSummary.executionConfidence}% confidence). Overdue tasks: ${overdueTasks}.`;
        suggestedQuestions = [
          'What is blocking this project?',
          'Which risks threaten our sprint?',
          'What should we prioritize today?',
        ];
        break;
      }

      default: {
        evidence.push({
          metric: 'Project Telemetry State',
          value: `Health: ${healthSummary.healthScore}/100, Tasks: ${totalTasks}`,
          source: 'project_state',
        });
        fallbackAnswer = `Insufficient project evidence to answer this query reliably. I can answer questions regarding project health, dependency blockers, risks, workload balance, and sprint status based on project telemetry.`;
        suggestedQuestions = [
          'What is blocking this project?',
          'Which risks threaten our sprint?',
          'What should we prioritize today?',
        ];
      }
    }

    const fallbackGenerator = () => ({
      answer: fallbackAnswer,
      suggestedQuestions,
    });

    const userContext = JSON.stringify({
      userQuery: dto.query,
      detectedIntent,
      projectName: healthSummary.projectName,
      evidence,
      healthScore: healthSummary.healthScore,
      healthStatus: healthSummary.healthStatus,
      trajectory: healthSummary.deliveryTrajectory,
      recommendations: healthSummary.recommendations,
      dataSufficiency: healthSummary.dataSufficiency,
    });

    const aiAnswer = await this.ollamaService.generateQueryAnswer(
      dto.query,
      detectedIntent,
      userContext,
      fallbackGenerator,
    );

    return {
      projectId,
      query: dto.query,
      detectedIntent,
      answer: aiAnswer.answer,
      evidence,
      suggestedQuestions: aiAnswer.suggestedQuestions,
      dataSufficiency: healthSummary.dataSufficiency,
      generatedBy: aiAnswer.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 8. Emerging Risk Intelligence ──────────────────────────────────────────

  async getEmergingRisks(
    projectId: string,
    authHeader?: string,
  ): Promise<EmergingRisksResponseDto> {
    const healthSummary = await this.getHealthSummary(projectId, authHeader);
    const bottlenecks = await this.getBottleneckAnalysis(projectId, authHeader);

    const emergingRisks: EmergingRiskItem[] = [];

    // Pattern A: Status oscillation / stalled tasks
    const inProg = Number(healthSummary.metrics?.inProgressTasks ?? 0);
    const overdue = Number(healthSummary.metrics?.overdueTasks ?? 0);
    if (inProg > 0 && overdue > 0) {
      emergingRisks.push({
        id: `ER-STAT-${projectId.slice(0, 8)}`,
        patternType: 'STATUS_OSCILLATION',
        title: 'Task Execution Stagnation & Stalled Progress',
        severity: 'HIGH',
        detectedFrom: 'task_lifecycle_telemetry',
        evidence: [
          `${overdue} tasks are overdue while active.`,
          `${inProg} tasks are currently in progress without resolution.`,
        ],
        impact:
          'Stalled tasks jeopardize milestone deadlines and downstream commitments.',
        recommendedMitigation:
          'Conduct immediate standup triage to unblock stalled assignees.',
        isOfficialRisk: false,
      });
    }

    // Pattern B: Workload concentration risk
    if (healthSummary.workloadPressure === 'HIGH') {
      emergingRisks.push({
        id: `ER-WORK-${projectId.slice(0, 8)}`,
        patternType: 'WORKLOAD_CONCENTRATION',
        title: 'Workload Imbalance & Concentration Risk',
        severity: 'HIGH',
        detectedFrom: 'team_assignment_distribution',
        evidence: [
          `Overall project workload pressure evaluated as ${healthSummary.workloadPressure}.`,
          `High-priority tasks are concentrated among few team members.`,
        ],
        impact:
          'Burnout, quality degradation, and single-point-of-failure delays.',
        recommendedMitigation:
          'Rebalance tasks across available team members before sprint close.',
        isOfficialRisk: false,
      });
    }

    // Pattern C: Sprint burndown deficit
    if (
      healthSummary.deliveryTrajectory === 'BEHIND_SCHEDULE' ||
      healthSummary.deliveryTrajectory === 'AT_RISK'
    ) {
      emergingRisks.push({
        id: `ER-SPRT-${projectId.slice(0, 8)}`,
        patternType: 'SPRINT_BURNDOWN_DEFICIT',
        title: 'Sprint Burndown Velocity Deficit',
        severity:
          healthSummary.deliveryTrajectory === 'AT_RISK'
            ? 'CRITICAL'
            : 'HIGH',
        detectedFrom: 'sprint_burndown_velocity',
        evidence: [
          `Delivery trajectory is currently ${healthSummary.deliveryTrajectory}.`,
          `Observed pace is ${String(healthSummary.metrics?.sprintVelocityPace ?? 0)} tasks/day vs ${String(healthSummary.metrics?.requiredPace ?? 0)} required.`,
        ],
        impact:
          'Active sprint commitments will likely slip past target delivery deadline.',
        recommendedMitigation:
          'Descape non-essential tasks to next sprint to protect core deliverables.',
        isOfficialRisk: false,
      });
    }

    // Pattern D: Dependency bottleneck
    if (bottlenecks.cascadingBlockers.length > 0) {
      const topBlocker = bottlenecks.cascadingBlockers[0];
      emergingRisks.push({
        id: `ER-BLCK-${projectId.slice(0, 8)}`,
        patternType: 'DEPENDENCY_BOTTLENECK',
        title: `Cascading Dependency Blocker: "${topBlocker.blockerTitle}"`,
        severity: 'CRITICAL',
        detectedFrom: 'dependency_graph_topology',
        evidence: [
          `Task is blocking ${topBlocker.blockedTasksCount} downstream task(s): ${topBlocker.blockedTaskTitles.slice(0, 3).join(', ')}.`,
          `Longest dependency chain length is ${bottlenecks.longestDependencyChain.length} levels deep.`,
        ],
        impact:
          'Downstream engineers cannot proceed, stalling critical path progress.',
        recommendedMitigation:
          'Prioritize code review and unblocking for root blocker immediately.',
        isOfficialRisk: false,
      });
    }

    return {
      projectId,
      projectName: healthSummary.projectName,
      totalDetected: emergingRisks.length,
      emergingRisks,
      summary:
        emergingRisks.length > 0
          ? `Detected ${emergingRisks.length} emerging unmanaged behavioral risk patterns requiring preventive action.`
          : 'No acute behavioral risk anomalies detected in active project telemetry.',
      generatedBy: healthSummary.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 9. Delivery Prediction ─────────────────────────────────────────────────

  async getDeliveryPrediction(
    projectId: string,
    authHeader?: string,
  ): Promise<DeliveryPredictionResponseDto> {
    const health = await this.getHealthSummary(projectId, authHeader);
    const metrics = health.metrics;

    const trajectory = health.deliveryTrajectory ?? 'INSUFFICIENT_DATA';
    const remainingDays = Number(metrics?.daysRemainingInSprint ?? 0);
    const activeTasks = Number(metrics?.inProgressTasks ?? 0);
    const overdueTasks = Number(metrics?.overdueTasks ?? 0);
    const remainingTasks = activeTasks + overdueTasks;
    const currentPace = Number(metrics?.sprintVelocityPace ?? 0);
    const requiredPace = Number(metrics?.requiredPace ?? 0);

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let confidencePercentage = 65;
    let confidenceReason = 'Based on active sprint velocity and task distribution.';

    if (trajectory === 'INSUFFICIENT_DATA' || (remainingDays === 0 && currentPace === 0)) {
      confidence = 'LOW';
      confidencePercentage = 25;
      confidenceReason = 'Insufficient historical sprint velocity or active task sample size.';
    } else if (remainingDays >= 3 && currentPace > 0) {
      confidence = 'HIGH';
      confidencePercentage = 85;
      confidenceReason = 'Derived from active multi-day velocity measurements and dependency graph status.';
    }

    let estimatedCompletionDate: string | null = null;
    if (currentPace > 0 && remainingTasks > 0) {
      const daysNeeded = Math.ceil(remainingTasks / currentPace);
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysNeeded);
      estimatedCompletionDate = estDate.toISOString();
    }

    const signals = [
      `Trajectory: ${trajectory}`,
      `Current Velocity: ${currentPace.toFixed(2)} tasks/day vs Required: ${requiredPace.toFixed(2)} tasks/day`,
      `Incomplete Tasks: ${remainingTasks} (${overdueTasks} overdue, ${Number(metrics?.blockedTasks ?? 0)} blocked)`,
      `Sprint Days Remaining: ${remainingDays}`,
    ];

    const recommendedIntervention =
      trajectory === 'AT_RISK' || trajectory === 'BEHIND_SCHEDULE'
        ? 'Reassign blocked or overdue tasks and consider moving low-priority scope items to next sprint.'
        : 'Maintain current velocity cadence and verify dependency handoffs are unblocked.';

    return {
      projectId,
      projectName: health.projectName,
      deliveryTrajectory: trajectory,
      confidence,
      confidencePercentage,
      confidenceReason,
      currentPaceTasksPerDay: Number(currentPace.toFixed(2)),
      requiredPaceTasksPerDay: Number(requiredPace.toFixed(2)),
      remainingDays,
      remainingTasks,
      estimatedCompletionDate,
      summary: `Delivery trajectory evaluated as ${trajectory} with ${confidence} confidence (${confidencePercentage}%). ${recommendedIntervention}`,
      signals,
      recommendedIntervention,
      generatedBy: health.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 10. Prioritized Action Plan ────────────────────────────────────────────

  async getActionPlan(
    projectId: string,
    authHeader?: string,
  ): Promise<ActionPlanResponseDto> {
    const health = await this.getHealthSummary(projectId, authHeader);
    const bottlenecks = await this.getBottleneckAnalysis(projectId, authHeader);

    const actions: ActionPlanItem[] = [];

    // 1. Critical Blockers
    if (bottlenecks.cascadingBlockers.length > 0) {
      const topBlocker = bottlenecks.cascadingBlockers[0];
      actions.push({
        priority: 'CRITICAL',
        category: 'BLOCKER',
        title: `Unblock "${topBlocker.blockerTitle}"`,
        description: `Resolve dependencies or blockers on "${topBlocker.blockerTitle}" to unblock ${topBlocker.blockedTasksCount} downstream tasks.`,
        targetEntity: topBlocker.blockerTitle,
        expectedImpact: 'Releases critical path blockage and restores sprint velocity flow.',
        evidence: [
          `Blocking ${topBlocker.blockedTasksCount} downstream tasks`,
          `Dependency chain depth: ${bottlenecks.longestDependencyChain.length}`,
        ],
      });
    }

    // 2. High Severity Risks
    const highRisks = (health.riskDeliveryImpact ?? []).filter(
      (r) => r.deliveryImpact === 'CRITICAL' || r.deliveryImpact === 'HIGH',
    );
    if (highRisks.length > 0) {
      const topRisk = highRisks[0];
      actions.push({
        priority: 'HIGH',
        category: 'RISK',
        title: `Execute Mitigation Plan for Risk "${topRisk.riskTitle}"`,
        description:
          topRisk.mitigationPlan ||
          'Review risk impact on delivery milestones with stakeholders and apply contingency.',
        targetEntity: topRisk.riskTitle,
        expectedImpact: 'Prevents risk realization from causing milestone delay.',
        evidence: [
          `Risk Score: ${topRisk.riskScore}/25`,
          `Delivery Impact: ${topRisk.deliveryImpact}`,
        ],
      });
    }

    // 3. Overdue & Stalled Tasks
    const overdueCount = Number(health.metrics?.overdueTasks ?? 0);
    if (overdueCount > 0) {
      actions.push({
        priority: 'HIGH',
        category: 'SCHEDULE',
        title: `Triage ${overdueCount} Overdue Tasks`,
        description:
          'Re-estimate due dates, reallocate capacity, or split tasks into smaller deliverable increments.',
        targetEntity: 'Overdue Task Queue',
        expectedImpact: 'Recalibrates realistic sprint delivery forecast.',
        evidence: [`${overdueCount} tasks are past target due date`],
      });
    }

    // 4. Workload Balancing
    if (health.workloadPressure === 'HIGH') {
      actions.push({
        priority: 'MEDIUM',
        category: 'WORKLOAD',
        title: 'Rebalance Team Workload Distribution',
        description:
          'Redistribute tasks from overallocated assignees to available peers.',
        targetEntity: 'Team Capacity Allocation',
        expectedImpact: 'Reduces burnout risk and accelerates parallel task completion.',
        evidence: [`Workload pressure index: ${health.workloadPressure}`],
      });
    }

    // 5. Default cadence action if project is clean
    if (actions.length === 0) {
      actions.push({
        priority: 'LOW',
        category: 'SCOPE',
        title: 'Maintain Delivery Cadence & Sprint Review',
        description:
          'Project telemetry is healthy. Continue tracking task milestones according to planned timeline.',
        targetEntity: 'Sprint Execution',
        expectedImpact: 'Sustains on-track delivery trajectory.',
        evidence: [`Composite Health Score: ${String(health.healthScore)}/100`],
      });
    }

    return {
      projectId,
      projectName: health.projectName,
      totalActions: actions.length,
      actions,
      summary: `Generated ${actions.length} prioritized, evidence-backed actions to optimize project delivery.`,
      generatedBy: health.generatedBy,
      generatedAt: new Date().toISOString(),
    };
  }
}
