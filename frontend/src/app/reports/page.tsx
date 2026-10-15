'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listProjects, type Project } from '@/lib/api/projects';
import {
  reportsApi,
  type ProjectOverviewReport,
  type TasksReport,
  type SprintsReport,
  type RisksReport,
} from '@/lib/api/reports';
import { ReportsSkeleton } from '@/components/reports/ReportsSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import {
  BarChart3,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Layers,
  ShieldAlert,
  Flame,
  Download,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';

export default function ReportsPage() {
  return (
    <AppShell>
      <React.Suspense fallback={<ReportsSkeleton />}>
        <ReportsWorkspaceContent />
      </React.Suspense>
    </AppShell>
  );
}

function ReportsWorkspaceContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(initialProjectId);

  const [overview, setOverview] = React.useState<ProjectOverviewReport | null>(null);
  const [tasksReport, setTasksReport] = React.useState<TasksReport | null>(null);
  const [sprintsReport, setSprintsReport] = React.useState<SprintsReport | null>(null);
  const [risksReport, setRisksReport] = React.useState<RisksReport | null>(null);

  const [loadingProjects, setLoadingProjects] = React.useState(true);
  const [loadingReports, setLoadingReports] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'sprints' | 'risks'>('overview');
  const [exportNotice, setExportNotice] = React.useState<string | null>(null);

  // Load accessible projects on mount
  React.useEffect(() => {
    let active = true;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!active) return;
        const projs = res.data ?? [];
        setProjects(projs);
        if (!initialProjectId && projs.length > 0) {
          // Default to first project if no searchParam provided
          setSelectedProjectId(projs[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load projects list.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });

    return () => {
      active = false;
    };
  }, [initialProjectId]);

  // Fetch report data for single project or portfolio aggregation
  const fetchReportsData = React.useCallback(async (targetId: string, availableProjects: Project[]) => {
    if (targetId === 'ALL') {
      if (availableProjects.length === 0) {
        return {
          overview: null,
          tasks: null,
          sprints: null,
          risks: null,
        };
      }

      const overviews = await Promise.all(
        availableProjects.map((p) =>
          reportsApi.getProjectOverview(p.id).catch(() => null),
        ),
      );

      const validOverviews = overviews.filter((o): o is ProjectOverviewReport => o !== null);

      let totTasks = 0;
      let compTasks = 0;
      let inProgTasks = 0;
      let pendTasks = 0;
      let blockTasks = 0;
      let overTasks = 0;

      let totSprints = 0;
      let actSprints = 0;
      let compSprints = 0;

      let totRisks = 0;
      let opRisks = 0;
      let mitRisks = 0;
      let resRisks = 0;
      let sumScore = 0;

      validOverviews.forEach((o) => {
        totTasks += o.tasks?.totalTasks ?? 0;
        compTasks += o.tasks?.completedTasks ?? 0;
        inProgTasks += o.tasks?.inProgressTasks ?? 0;
        pendTasks += o.tasks?.pendingTasks ?? 0;
        blockTasks += o.tasks?.blockedTasks ?? 0;
        overTasks += o.tasks?.overdue ?? 0;

        totSprints += o.sprints?.totalSprints ?? 0;
        actSprints += o.sprints?.activeSprints ?? 0;
        compSprints += o.sprints?.completedSprints ?? 0;

        totRisks += o.risks?.totalRisks ?? 0;
        opRisks += o.risks?.openRisks ?? 0;
        mitRisks += o.risks?.mitigatingRisks ?? 0;
        resRisks += o.risks?.resolvedRisks ?? 0;
        sumScore += o.risks?.averageScore ?? 0;
      });

      const avgScore = validOverviews.length > 0 ? sumScore / validOverviews.length : 0;
      const taskPct = totTasks > 0 ? Math.round((compTasks / totTasks) * 100) : 0;

      return {
        overview: {
          projectId: 'ALL',
          project: {
            id: 'ALL',
            name: 'All Projects (Portfolio Summary)',
            status: 'ACTIVE',
            start_date: null,
            end_date: null,
            owner_id: null,
          },
          tasks: {
            totalTasks: totTasks,
            completedTasks: compTasks,
            pendingTasks: pendTasks,
            inProgressTasks: inProgTasks,
            blockedTasks: blockTasks,
            taskCompletionPercentage: taskPct,
            overdue: overTasks,
          },
          sprints: {
            totalSprints: totSprints,
            activeSprints: actSprints,
            completedSprints: compSprints,
          },
          risks: {
            totalRisks: totRisks,
            openRisks: opRisks,
            mitigatingRisks: mitRisks,
            resolvedRisks: resRisks,
            averageScore: avgScore,
          },
        },
        tasks: {
          projectId: 'ALL',
          total: totTasks,
          byStatus: {
            TODO: pendTasks,
            IN_PROGRESS: inProgTasks,
            IN_REVIEW: 0,
            DONE: compTasks,
            BLOCKED: blockTasks,
          },
          byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
          overdueTasks: overTasks,
        },
        sprints: {
          projectId: 'ALL',
          total: totSprints,
          byStatus: {
            PLANNED: Math.max(0, totSprints - actSprints - compSprints),
            ACTIVE: actSprints,
            COMPLETED: compSprints,
            CANCELLED: 0,
          },
        },
        risks: {
          projectId: 'ALL',
          total: totRisks,
          byStatus: {
            OPEN: opRisks,
            MITIGATING: mitRisks,
            RESOLVED: resRisks,
            ACCEPTED: 0,
            CLOSED: 0,
          },
          byProbability: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          byImpact: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          averageRiskScore: avgScore,
          highScoreRisks: 0,
        },
      };
    } else {
      const [overviewData, tasksData, sprintsData, risksData] = await Promise.all([
        reportsApi.getProjectOverview(targetId),
        reportsApi.getTasksReport(targetId),
        reportsApi.getSprintsReport(targetId),
        reportsApi.getRisksReport(targetId),
      ]);

      return {
        overview: overviewData,
        tasks: tasksData,
        sprints: sprintsData,
        risks: risksData,
      };
    }
  }, []);

  const refreshReports = React.useCallback(async () => {
    if (!selectedProjectId && projects.length === 0) return;
    const targetId = selectedProjectId || 'ALL';
    setLoadingReports(true);
    setError(null);
    try {
      const data = await fetchReportsData(targetId, projects);
      setOverview(data.overview);
      setTasksReport(data.tasks);
      setSprintsReport(data.sprints);
      setRisksReport(data.risks);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics and reporting metrics.';
      setError(msg);
    } finally {
      setLoadingReports(false);
    }
  }, [selectedProjectId, projects, fetchReportsData]);

  React.useEffect(() => {
    let active = true;
    if (!selectedProjectId && projects.length === 0) return;
    const targetId = selectedProjectId || 'ALL';

    fetchReportsData(targetId, projects)
      .then((data) => {
        if (!active) return;
        setOverview(data.overview);
        setTasksReport(data.tasks);
        setSprintsReport(data.sprints);
        setRisksReport(data.risks);
        setLoadingReports(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load analytics metrics.';
        setError(msg);
        setLoadingReports(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId, projects, fetchReportsData]);

  const selectedProject = React.useMemo(() => {
    if (selectedProjectId === 'ALL') {
      return { id: 'ALL', name: 'All Projects (Portfolio)', status: 'ACTIVE', startDate: null };
    }
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Metric derivations
  const totalTasks = tasksReport?.total ?? overview?.tasks?.totalTasks ?? 0;
  const completedTasks = tasksReport?.byStatus?.DONE ?? overview?.tasks?.completedTasks ?? 0;
  const inProgressTasks = tasksReport?.byStatus?.IN_PROGRESS ?? overview?.tasks?.inProgressTasks ?? 0;
  const todoTasks = tasksReport?.byStatus?.TODO ?? overview?.tasks?.pendingTasks ?? 0;
  const inReviewTasks = tasksReport?.byStatus?.IN_REVIEW ?? 0;
  const blockedTasks = tasksReport?.byStatus?.BLOCKED ?? overview?.tasks?.blockedTasks ?? 0;
  const overdueTasks = tasksReport?.overdueTasks ?? overview?.tasks?.overdue ?? 0;
  const completionPercentage =
    overview?.tasks?.taskCompletionPercentage ??
    (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  const totalSprints = sprintsReport?.total ?? overview?.sprints?.totalSprints ?? 0;
  const activeSprints = sprintsReport?.byStatus?.ACTIVE ?? overview?.sprints?.activeSprints ?? 0;
  const completedSprints = sprintsReport?.byStatus?.COMPLETED ?? overview?.sprints?.completedSprints ?? 0;
  const plannedSprints = sprintsReport?.byStatus?.PLANNED ?? Math.max(0, totalSprints - activeSprints - completedSprints);
  const cancelledSprints = sprintsReport?.byStatus?.CANCELLED ?? 0;

  const totalRisks = risksReport?.total ?? overview?.risks?.totalRisks ?? 0;
  const openRisks = risksReport?.byStatus?.OPEN ?? overview?.risks?.openRisks ?? 0;
  const mitigatingRisks = risksReport?.byStatus?.MITIGATING ?? overview?.risks?.mitigatingRisks ?? 0;
  const resolvedRisks = risksReport?.byStatus?.RESOLVED ?? overview?.risks?.resolvedRisks ?? 0;
  const avgRiskScore = risksReport?.averageRiskScore ?? overview?.risks?.averageScore ?? 0;
  const highScoreRisks = risksReport?.highScoreRisks ?? 0;

  // Handle Export CSV
  function handleExportCsv() {
    if (!selectedProject) return;

    const csvRows: string[][] = [
      ['AIPMS Executive Report Summary'],
      ['Generated At', new Date().toISOString()],
      ['Project Scope', selectedProject.name],
      ['Project ID', selectedProject.id],
      ['Project Status', selectedProject.status || 'N/A'],
      [''],
      ['Metric Category', 'Metric Name', 'Value'],
      ['Tasks', 'Total Tasks', String(totalTasks)],
      ['Tasks', 'Completed Tasks (DONE)', String(completedTasks)],
      ['Tasks', 'In Progress Tasks', String(inProgressTasks)],
      ['Tasks', 'To Do Tasks', String(todoTasks)],
      ['Tasks', 'In Review Tasks', String(inReviewTasks)],
      ['Tasks', 'Blocked Tasks', String(blockedTasks)],
      ['Tasks', 'Overdue Tasks', String(overdueTasks)],
      ['Tasks', 'Completion Rate (%)', `${completionPercentage}%`],
      ['Sprints', 'Total Sprints', String(totalSprints)],
      ['Sprints', 'Active Sprints', String(activeSprints)],
      ['Sprints', 'Completed Sprints', String(completedSprints)],
      ['Sprints', 'Planned Sprints', String(plannedSprints)],
      ['Risks', 'Total Risks', String(totalRisks)],
      ['Risks', 'Open Risks', String(openRisks)],
      ['Risks', 'Mitigating Risks', String(mitigatingRisks)],
      ['Risks', 'Resolved Risks', String(resolvedRisks)],
      ['Risks', 'Average Risk Score (/9.0)', avgRiskScore.toFixed(2)],
      ['Risks', 'High Score Risks (>=6)', String(highScoreRisks)],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.map((cell) => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `AIPMS_Report_${selectedProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(`Exported report data to "${filename}"`);
    setTimeout(() => setExportNotice(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Reports &amp; Analytics
            </h1>
            <Badge variant="info" className="text-xs">Reporting Service</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Understand project progress, delivery activity, and risk exposure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loadingReports || !selectedProject}
            className="gap-1.5 border-slate-200 dark:border-slate-800"
          >
            <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Export CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshReports()}
            disabled={loadingReports}
            className="gap-1.5 border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loadingReports ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Export Success Notification */}
      {exportNotice && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 shadow-2xs">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Project Scope Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <FolderKanban className="h-5 w-5 text-primary shrink-0" />
          <div className="space-y-0.5 flex-1 sm:flex-initial">
            <label htmlFor="project-scope-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Project Scope
            </label>
            <div>
              {loadingProjects ? (
                <span className="text-sm text-slate-400">Loading projects list...</span>
              ) : (
                <select
                  id="project-scope-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-2xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Projects (Portfolio Summary)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {selectedProject && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Status: {selectedProject.status}
            </Badge>
            {selectedProjectId !== 'ALL' && (
              <Link
                href={`/projects/${selectedProjectId}`}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <span>View Workspace</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <ErrorState
          title="Unable to load analytics metrics"
          error={error}
          onRetry={() => refreshReports()}
          variant="card"
        />
      )}

      {/* Reports Workspace Content */}
      {loadingReports ? (
        <ReportsSkeleton />
      ) : (
        <>
          {/* Top Executive KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Task Completion Rate Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Task Completion
                </CardTitle>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {completionPercentage}%
                </div>
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </CardContent>
            </Card>

            {/* Task Bottlenecks Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Task Bottlenecks
                </CardTitle>
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800">
                  <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {overdueTasks}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {blockedTasks} blocked • {inProgressTasks} in progress
                </p>
                <div className="mt-2 flex gap-1.5">
                  {overdueTasks > 0 ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {overdueTasks} Overdue Tasks
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      0 Overdue Tasks
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sprints Iteration Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sprint Iterations
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {activeSprints} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">active</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {completedSprints} completed • {totalSprints} total
                </p>
                <div className="mt-2 flex gap-1.5">
                  <Badge variant="secondary" className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {plannedSprints} Planned Iterations
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Risk Exposure Card */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Risk Score &amp; Exposure
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {avgRiskScore.toFixed(1)} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/ 9.0</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {openRisks} open • {mitigatingRisks} mitigating
                </p>
                <div className="mt-2 flex gap-1.5">
                  {highScoreRisks > 0 ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {highScoreRisks} High-Score (≥6)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      0 High-Score Risks
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Integrity & Historical Snapshot Notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Factual Telemetry Notice:</strong> Analytics metrics reflect real cumulative project state returned by the Reporting Gateway service. No speculative velocity or fake percentage trends are generated.
            </span>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Executive Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Task Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sprints')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'sprints'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Sprint Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('risks')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'risks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Risk Analytics
            </button>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Task Health Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Task Health &amp; Distribution
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Status breakdown across all tasks in current project scope
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Completed (DONE)', count: completedTasks, color: 'bg-emerald-500', total: totalTasks },
                    { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500', total: totalTasks },
                    { label: 'In Review', count: inReviewTasks, color: 'bg-purple-500', total: totalTasks },
                    { label: 'To Do (Pending)', count: todoTasks, color: 'bg-slate-400', total: totalTasks },
                    { label: 'Blocked', count: blockedTasks, color: 'bg-rose-500', total: totalTasks },
                  ].map((item) => {
                    const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                          <span className="text-slate-500 dark:text-slate-400">{item.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className={`${item.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Risk Severity Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Risk Severity Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Risk status distribution &amp; average risk score
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Risks</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalRisks}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800">
                      <div className="text-xs text-amber-700 dark:text-amber-300 uppercase font-semibold">Average Score</div>
                      <div className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{avgRiskScore.toFixed(1)} / 9</div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Open Risks</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{openRisks}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Mitigating Actions Active</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{mitigatingRisks}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Resolved / Closed</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{resolvedRisks + (risksReport?.byStatus?.CLOSED ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-rose-600 dark:text-rose-400 font-medium">Critical Risks (Score ≥ 6)</span>
                      <span className="font-bold text-rose-700 dark:text-rose-300">{highScoreRisks}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: TASKS ANALYTICS */}
          {activeTab === 'tasks' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Tasks by Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { status: 'TODO', count: todoTasks, label: 'To Do', color: 'bg-slate-400' },
                    { status: 'IN_PROGRESS', count: inProgressTasks, label: 'In Progress', color: 'bg-blue-500' },
                    { status: 'IN_REVIEW', count: inReviewTasks, label: 'In Review', color: 'bg-purple-500' },
                    { status: 'DONE', count: completedTasks, label: 'Done', color: 'bg-emerald-500' },
                    { status: 'BLOCKED', count: blockedTasks, label: 'Blocked', color: 'bg-rose-500' },
                  ].map((s) => {
                    const pct = totalTasks > 0 ? Math.round((s.count / totalTasks) * 100) : 0;
                    return (
                      <div key={s.status} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`${s.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Priority Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    Tasks by Priority
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { priority: 'URGENT', count: tasksReport?.byPriority?.URGENT ?? 0, label: 'Urgent', color: 'bg-rose-600' },
                    { priority: 'HIGH', count: tasksReport?.byPriority?.HIGH ?? 0, label: 'High', color: 'bg-amber-500' },
                    { priority: 'MEDIUM', count: tasksReport?.byPriority?.MEDIUM ?? 0, label: 'Medium', color: 'bg-blue-500' },
                    { priority: 'LOW', count: tasksReport?.byPriority?.LOW ?? 0, label: 'Low', color: 'bg-slate-400' },
                  ].map((p) => {
                    const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
                    return (
                      <div key={p.priority} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{p.label} Priority</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{p.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                          <div className={`${p.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: SPRINTS ANALYTICS */}
          {activeTab === 'sprints' && (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Sprint Lifecycle Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Sprint status distribution across iterations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">PLANNED</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{plannedSprints}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/40 text-center">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">ACTIVE</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{activeSprints}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 text-center">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">COMPLETED</div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{completedSprints}</div>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">CANCELLED</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{cancelledSprints}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: RISKS ANALYTICS */}
          {activeTab === 'risks' && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Status Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'OPEN', count: openRisks, color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'MITIGATING', count: mitigatingRisks, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'RESOLVED', count: resolvedRisks, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'ACCEPTED', count: risksReport?.byStatus?.ACCEPTED ?? 0, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'CLOSED', count: risksReport?.byStatus?.CLOSED ?? 0, color: 'text-slate-500 dark:text-slate-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Probability Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Probability Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'HIGH Probability', count: risksReport?.byProbability?.HIGH ?? 0, color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'MEDIUM Probability', count: risksReport?.byProbability?.MEDIUM ?? 0, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'LOW Probability', count: risksReport?.byProbability?.LOW ?? 0, color: 'text-slate-600 dark:text-slate-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Impact Breakdown */}
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Impact Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'HIGH Impact', count: risksReport?.byImpact?.HIGH ?? 0, color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'MEDIUM Impact', count: risksReport?.byImpact?.MEDIUM ?? 0, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'LOW Impact', count: risksReport?.byImpact?.LOW ?? 0, color: 'text-slate-600 dark:text-slate-400' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
