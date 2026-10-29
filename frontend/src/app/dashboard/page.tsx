'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Calendar,
  ChevronDown,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { StatCards, type StatMetrics } from '@/components/dashboard/StatCards';
import { DeliveryTrendChart } from '@/components/dashboard/DeliveryTrendChart';
import { SprintHealthCard } from '@/components/dashboard/SprintHealthCard';
import { TaskDistributionCard } from '@/components/dashboard/TaskDistributionCard';
import { TopProjectsTable } from '@/components/dashboard/TopProjectsTable';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { UpcomingDeadlinesCard } from '@/components/dashboard/UpcomingDeadlinesCard';
import { PriorityRisksCard } from '@/components/dashboard/PriorityRisksCard';
import { AIAssistantPanel } from '@/components/dashboard/AIAssistantPanel';
import { AIToolModal, type AIToolType } from '@/components/dashboard/AIToolModal';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ProjectForm } from '@/components/projects/ProjectForm';

import { listProjects, createProject, type Project } from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { listRisks, type Risk } from '@/lib/api/risks';
import { listSprints, type Sprint } from '@/lib/api/sprints';

export type DateFilterOption = 'Last 7 days' | 'Last 30 days' | 'Last 90 days' | 'All time';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [sprints, setSprints] = React.useState<Sprint[]>([]);
  const [risks, setRisks] = React.useState<Risk[]>([]);
  const [metrics, setMetrics] = React.useState<StatMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dateFilter, setDateFilter] = React.useState<DateFilterOption>('Last 30 days');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);

  // Active AI Tool Modal state driven by query parameter ?tool=...
  const activeToolParam =
    (searchParams.get('tool') as AIToolType) ||
    (searchParams.get('action') === 'ask_ai' ? 'query' : null);

  // RBAC permission check for project creation (PM cannot create projects by default)
  const canCreateProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_OWNER';

  const fetchDashboardData = React.useCallback(async (isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const failedSections: string[] = [];

      // Parallel fetch projects, tasks, sprints, and risks from API Gateway using limit: 500 for tasks
      const [projResult, taskResult, sprintResult, riskResult] = await Promise.allSettled([
        listProjects({ limit: 100 }),
        listTasks({ limit: 500 }),
        listSprints({ limit: 100 }),
        listRisks({ limit: 100 }),
      ]);

      let projList: Project[] = [];
      let totalProjectsCount = 0;
      if (projResult.status === 'fulfilled') {
        const resp = projResult.value;
        projList = Array.isArray(resp) ? resp : resp.data ?? [];
        totalProjectsCount = !Array.isArray(resp) && resp.meta?.total !== undefined ? resp.meta.total : projList.length;
      } else {
        failedSections.push('Projects');
      }

      let taskList: Task[] = [];
      let totalTasksCount = 0;
      if (taskResult.status === 'fulfilled') {
        const resp = taskResult.value;
        taskList = Array.isArray(resp) ? resp : resp.data ?? [];
        totalTasksCount = !Array.isArray(resp) && resp.meta?.total !== undefined ? resp.meta.total : taskList.length;
      } else {
        failedSections.push('Tasks');
      }

      let sprintList: Sprint[] = [];
      if (sprintResult.status === 'fulfilled') {
        const resp = sprintResult.value;
        sprintList = Array.isArray(resp) ? resp : (resp as { data?: Sprint[] }).data ?? [];
      } else {
        failedSections.push('Sprints');
      }

      let riskList: Risk[] = [];
      if (riskResult.status === 'fulfilled') {
        const resp = riskResult.value;
        riskList = Array.isArray(resp) ? resp : (resp as { data?: Risk[] }).data ?? [];
      } else {
        failedSections.push('Risks');
      }

      if (failedSections.length > 0) {
        setError(`Unable to load complete metrics for: ${failedSections.join(', ')}. Displaying available data.`);
      }

      setProjects(projList);
      setTasks(taskList);
      setSprints(sprintList);
      setRisks(riskList);

      // Dynamic metrics calculation based on fetched dataset
      const activeProjCount = projList.filter((p) => p.status === 'ACTIVE').length;
      const completedProjCount = projList.filter((p) => p.status === 'COMPLETED').length;

      const doneTasksCount = taskList.filter((t) => t.status === 'DONE').length;
      // Guarantee exact mathematical balance: doneTasks + remainingTasks === totalTasks
      const remainingTasksCount = Math.max(0, totalTasksCount - doneTasksCount);

      // Mutually exclusive open risk analysis
      const openRisksList = riskList.filter((r) => r.status === 'OPEN' || r.status === 'MITIGATING');
      const openRisksCount = openRisksList.length;

      const highRisksList = openRisksList.filter(
        (r) => (r.riskScore ?? 0) >= 6 || r.probability === 'HIGH' || r.impact === 'HIGH',
      );
      const highRisksCount = highRisksList.length;

      const mediumRisksCount = openRisksList.filter((r) => {
        const isHigh = (r.riskScore ?? 0) >= 6 || r.probability === 'HIGH' || r.impact === 'HIGH';
        if (isHigh) return false;
        return (r.riskScore ?? 0) >= 3 || r.probability === 'MEDIUM' || r.impact === 'MEDIUM';
      }).length;

      // Critical risk project IDs: only projects with CRITICAL open risks (riskScore >= 9, or OPEN with HIGH impact and HIGH probability)
      const criticalRiskProjectIds = new Set(
        openRisksList
          .filter((r) => (r.riskScore ?? 0) >= 9 || (r.probability === 'HIGH' && r.impact === 'HIGH' && r.status === 'OPEN'))
          .map((r) => r.projectId)
          .filter(Boolean),
      );

      const activeSprintsList = sprintList.filter((s) => s.status === 'ACTIVE');
      const activeSprintsCount = activeSprintsList.length;

      // Group tasks by sprint ID to inspect sprint-level execution blockers
      const sprintBlockedMap = new Map<string, number>();
      taskList.forEach((t) => {
        const sId = t.sprintId || (t as any).sprint_id;
        if (sId && t.status === 'BLOCKED') {
          sprintBlockedMap.set(sId, (sprintBlockedMap.get(sId) || 0) + 1);
        }
      });

      // Classify active sprints:
      // - Off Track: past due (endDate < Date.now())
      // - At Risk: has blocked tasks OR project has critical unmitigated risk (score >= 9)
      // - On Track: actively progressing, no blockers, on schedule
      let onTrackSprintsCount = 0;
      let atRiskSprintsCount = 0;

      activeSprintsList.forEach((s) => {
        const endDateVal = s.endDate || (s as any).end_date;
        const endDate = new Date(endDateVal).getTime();
        const isPastDue = !isNaN(endDate) && endDate < Date.now();
        const blockedTasks = sprintBlockedMap.get(s.id) || 0;
        const sProjId = s.projectId || (s as any).project_id;
        const hasCriticalRisk = sProjId ? criticalRiskProjectIds.has(sProjId) : false;

        if (isPastDue || blockedTasks > 0 || hasCriticalRisk) {
          atRiskSprintsCount++;
        } else {
          onTrackSprintsCount++;
        }
      });

      setMetrics({
        totalProjects: totalProjectsCount,
        activeProjects: activeProjCount,
        completedProjects: completedProjCount,
        totalTasks: totalTasksCount,
        doneTasks: doneTasksCount,
        remainingTasks: remainingTasksCount,
        activeSprints: activeSprintsCount,
        onTrackSprints: onTrackSprintsCount,
        atRiskSprints: atRiskSprintsCount,
        openRisks: openRisksCount,
        highRisks: highRisksCount,
        mediumRisks: mediumRisksCount,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load live backend metrics';
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) {
        await fetchDashboardData(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [fetchDashboardData]);

  const [now] = React.useState(() => Date.now());

  // Date filtering logic
  const filteredTasks = React.useMemo(() => {
    if (dateFilter === 'All time') return tasks;

    const daysMap: Record<DateFilterOption, number> = {
      'Last 7 days': 7,
      'Last 30 days': 30,
      'Last 90 days': 90,
      'All time': Infinity,
    };

    const cutoff = now - daysMap[dateFilter] * 24 * 60 * 60 * 1000;

    return tasks.filter((t) => {
      const time = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      return time >= cutoff;
    });
  }, [tasks, dateFilter, now]);

  const handleCloseToolModal = () => {
    router.push('/dashboard');
  };

  // Compute Task Status breakdown
  const taskDone = filteredTasks.filter((t) => t.status === 'DONE').length;
  const taskInProgress = filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const taskInReview = filteredTasks.filter((t) => t.status === 'IN_REVIEW').length;
  const taskTodo = filteredTasks.filter((t) => t.status === 'TODO').length;
  const taskBlocked = filteredTasks.filter((t) => t.status === 'BLOCKED').length;

  // Compute Sprint Health breakdown
  const sprintOnTrack = metrics?.onTrackSprints ?? 0;
  const sprintAtRisk = metrics?.atRiskSprints ?? 0;
  const sprintPlanned = sprints.filter((s) => s.status === 'PLANNED').length;
  const sprintOffTrack = sprints.filter((s) => {
    if (s.status !== 'ACTIVE') return false;
    const endDateVal = s.endDate || (s as any).end_date;
    const endDate = new Date(endDateVal).getTime();
    return !isNaN(endDate) && endDate < Date.now();
  }).length;

  // Dynamic user greeting name from auth context
  const rawName = user?.name?.trim() || '';
  const firstName = rawName ? rawName.split(/\s+/)[0] : 'User';
  const greetingText = `${getTimeBasedGreeting()}, ${firstName}`;

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Executive Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span suppressHydrationWarning>{greetingText}</span>
              <span className="text-xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              A clear view of delivery health, risks, and what needs attention.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            {/* Date Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className="h-9 flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Filter date range"
              >
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{dateFilter}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1 z-20 text-xs">
                  {(['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'] as DateFilterOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setDateFilter(opt);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                        dateFilter === opt
                          ? 'bg-blue-50 text-[#0052FF] dark:bg-blue-950/40 dark:text-[#4D7CFF] font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Data Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchDashboardData(true)}
              disabled={loading || isRefreshing}
              className="h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 flex items-center px-3.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {/* New Project Action (RBAC Protected) */}
            {canCreateProject && (
              <ProjectForm
                mode="create"
                ownerId={user?.id ?? ''}
                trigger={
                  <Button
                    size="sm"
                    className="h-9 rounded-xl bg-[#0052FF] hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 px-4 shadow-xs hover:shadow-md transition-all flex items-center"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>New Project</span>
                  </Button>
                }
                onSubmit={(payload) => createProject(payload as Parameters<typeof createProject>[0])}
                onSuccess={() => void fetchDashboardData(true)}
              />
            )}
          </div>
        </div>

        {/* Section Error Alert */}
        {error && (
          <ErrorState
            title="Dashboard telemetry error"
            error={error}
            onRetry={() => void fetchDashboardData(false)}
            variant="banner"
          />
        )}

        {/* Render Skeleton or Main Dashboard Sections */}
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* 1. Executive KPI Strip */}
            <StatCards metrics={metrics} loading={loading} />

            {/* 2. Main Analytics & AI Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left / Center Column (2 Cols Wide) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Row 1: Delivery Trend Chart & Sprint Health */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DeliveryTrendChart tasks={tasks} sprints={sprints} />
                  <SprintHealthCard
                    onTrack={sprintOnTrack}
                    atRisk={sprintAtRisk}
                    offTrack={sprintOffTrack}
                    notStarted={sprintPlanned}
                  />
                </div>

                {/* Row 2: Task Distribution & Project Portfolio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TaskDistributionCard
                    done={taskDone}
                    inProgress={taskInProgress}
                    inReview={taskInReview}
                    todo={taskTodo}
                    blocked={taskBlocked}
                  />
                  <TopProjectsTable projects={projects} tasks={tasks} />
                </div>

                {/* Row 3: Priority Risks, Upcoming Deadlines, Recent Activity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PriorityRisksCard risks={risks} projects={projects} />
                  <UpcomingDeadlinesCard tasks={filteredTasks} projects={projects} />
                  <RecentActivityCard
                    tasks={filteredTasks}
                    projects={projects}
                    risks={risks}
                    sprints={sprints}
                  />
                </div>
              </div>

              {/* Right Column: AI Project Intelligence Panel */}
              <div className="lg:col-span-1">
                <AIAssistantPanel
                  projects={projects}
                  projectId={
                    projects.find((p) => tasks.some((t) => t.projectId === p.id))?.id ||
                    projects[0]?.id
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Interactive AI Tool Sheet Modal */}
        {activeToolParam && (
          <AIToolModal
            tool={activeToolParam}
            onClose={handleCloseToolModal}
            projects={projects}
            initialProjectId={
              projects.find((p) => tasks.some((t) => t.projectId === p.id))?.id ||
              projects[0]?.id
            }
          />
        )}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center p-8 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0052FF] animate-spin" />
            <span>Loading AIPMS Operations Command Center...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}

