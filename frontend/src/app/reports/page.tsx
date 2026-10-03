'use client';

import * as React from 'react';
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
import {
  BarChart3,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Layers,
  AlertCircle,
  ShieldAlert,
  Flame,
} from 'lucide-react';

export default function ReportsPage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');

  const [overview, setOverview] = React.useState<ProjectOverviewReport | null>(null);
  const [tasksReport, setTasksReport] = React.useState<TasksReport | null>(null);
  const [sprintsReport, setSprintsReport] = React.useState<SprintsReport | null>(null);
  const [risksReport, setRisksReport] = React.useState<RisksReport | null>(null);

  const [loadingProjects, setLoadingProjects] = React.useState(true);
  const [loadingReports, setLoadingReports] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'sprints' | 'risks'>('overview');

  // Load accessible projects on mount
  React.useEffect(() => {
    let active = true;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!active) return;
        const projs = res.data ?? [];
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load projects.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoadingProjects(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Fetch report data whenever selectedProjectId changes
  const fetchReports = React.useCallback(async (projectId: string) => {
    if (!projectId) {
      setOverview(null);
      setTasksReport(null);
      setSprintsReport(null);
      setRisksReport(null);
      return;
    }

    setLoadingReports(true);
    setError(null);

    try {
      const [overviewData, tasksData, sprintsData, risksData] = await Promise.all([
        reportsApi.getProjectOverview(projectId),
        reportsApi.getTasksReport(projectId),
        reportsApi.getSprintsReport(projectId),
        reportsApi.getRisksReport(projectId),
      ]);

      setOverview(overviewData);
      setTasksReport(tasksData);
      setSprintsReport(sprintsData);
      setRisksReport(risksData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics and reporting metrics.';
      setError(msg);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      return;
    }

    Promise.all([
      reportsApi.getProjectOverview(selectedProjectId),
      reportsApi.getTasksReport(selectedProjectId),
      reportsApi.getSprintsReport(selectedProjectId),
      reportsApi.getRisksReport(selectedProjectId),
    ])
      .then(([overviewData, tasksData, sprintsData, risksData]) => {
        if (!active) return;
        setOverview(overviewData);
        setTasksReport(tasksData);
        setSprintsReport(sprintsData);
        setRisksReport(risksData);
        setLoadingReports(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Failed to load analytics and reporting metrics.';
        setError(msg);
        setLoadingReports(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  const selectedProject = React.useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Calculations for visual progress bars
  const totalTasks = tasksReport?.total ?? overview?.tasks?.totalTasks ?? 0;
  const completedTasks = tasksReport?.byStatus?.DONE ?? overview?.tasks?.completedTasks ?? 0;
  const inProgressTasks = tasksReport?.byStatus?.IN_PROGRESS ?? overview?.tasks?.inProgressTasks ?? 0;
  const todoTasks = tasksReport?.byStatus?.TODO ?? 0;
  const inReviewTasks = tasksReport?.byStatus?.IN_REVIEW ?? 0;
  const blockedTasks = tasksReport?.byStatus?.BLOCKED ?? overview?.tasks?.blockedTasks ?? 0;
  const overdueTasks = tasksReport?.overdueTasks ?? overview?.tasks?.overdue ?? 0;
  const completionPercentage =
    overview?.tasks?.taskCompletionPercentage ??
    (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  const totalSprints = sprintsReport?.total ?? overview?.sprints?.totalSprints ?? 0;
  const activeSprints = sprintsReport?.byStatus?.ACTIVE ?? overview?.sprints?.activeSprints ?? 0;
  const completedSprints = sprintsReport?.byStatus?.COMPLETED ?? overview?.sprints?.completedSprints ?? 0;
  const plannedSprints = sprintsReport?.byStatus?.PLANNED ?? 0;
  const cancelledSprints = sprintsReport?.byStatus?.CANCELLED ?? 0;

  const totalRisks = risksReport?.total ?? overview?.risks?.totalRisks ?? 0;
  const openRisks = risksReport?.byStatus?.OPEN ?? overview?.risks?.openRisks ?? 0;
  const mitigatingRisks = risksReport?.byStatus?.MITIGATING ?? overview?.risks?.mitigatingRisks ?? 0;
  const resolvedRisks = risksReport?.byStatus?.RESOLVED ?? overview?.risks?.resolvedRisks ?? 0;
  const avgRiskScore = risksReport?.averageRiskScore ?? overview?.risks?.averageScore ?? 0;
  const highScoreRisks = risksReport?.highScoreRisks ?? 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Reporting & Analytics
              </h2>
              <Badge variant="info">Reporting Service :3007</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Cross-service executive overview, sprint velocity, task distribution, and risk analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectedProjectId && fetchReports(selectedProjectId)}
              disabled={loadingReports || !selectedProjectId}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loadingReports ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Project Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <FolderKanban className="h-5 w-5 text-slate-500 shrink-0" />
            <div className="space-y-0.5">
              <label htmlFor="project-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Select Project Scope
              </label>
              <div>
                {loadingProjects ? (
                  <span className="text-sm text-slate-400">Loading accessible projects...</span>
                ) : projects.length === 0 ? (
                  <span className="text-sm text-slate-500">No projects found. Create a project first.</span>
                ) : (
                  <select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs">
                Status: {selectedProject.status}
              </Badge>
              {selectedProject.startDate && (
                <span className="text-xs text-slate-400">
                  Starts {new Date(selectedProject.startDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="flex-1">{error}</div>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-100"
              onClick={() => selectedProjectId && fetchReports(selectedProjectId)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* No Projects State */}
        {!loadingProjects && projects.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <FolderKanban className="h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800">No Projects Available</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                You do not have access to any projects. Create or join a project to view aggregated reports and analytics.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reports Content */}
        {selectedProjectId && (
          <>
            {/* Top Executive KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Task Completion Card */}
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Task Completion
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingReports ? '--' : `${completionPercentage}%`}
                  </div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {loadingReports ? 'Calculating...' : `${completedTasks} of ${totalTasks} tasks done`}
                  </p>
                </CardContent>
              </Card>

              {/* Overdue & Blocked Tasks Card */}
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Task Bottlenecks
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <Clock className="h-4 w-4 text-rose-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingReports ? '--' : overdueTasks}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {blockedTasks} blocked • {inProgressTasks} in progress
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {overdueTasks > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {overdueTasks} Overdue
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                        0 Overdue
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sprints Velocity Card */}
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sprint Iterations
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingReports ? '--' : activeSprints}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {completedSprints} completed • {totalSprints} total
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">
                      {plannedSprints} Planned
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Exposure Card */}
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Risk Score & Exposure
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {loadingReports ? '--' : avgRiskScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 9.0</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {openRisks} open • {mitigatingRisks} mitigating
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {highScoreRisks > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {highScoreRisks} High-Score (≥6)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                        0 High Risks
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Executive Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Task Distribution
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sprints')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'sprints'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Sprint Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('risks')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'risks'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Risk Analytics
              </button>
            </div>

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Task Status Breakdown Visual */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Task Health & Status
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Status breakdown across all tasks in this project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Completed (DONE)', count: completedTasks, color: 'bg-emerald-500', total: totalTasks },
                      { label: 'In Progress', count: inProgressTasks, color: 'bg-blue-500', total: totalTasks },
                      { label: 'In Review', count: inReviewTasks, color: 'bg-indigo-500', total: totalTasks },
                      { label: 'To Do (Pending)', count: todoTasks, color: 'bg-slate-400', total: totalTasks },
                      { label: 'Blocked', count: blockedTasks, color: 'bg-rose-500', total: totalTasks },
                    ].map((item) => {
                      const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="text-slate-500">{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`${item.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Risk Distribution Summary */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Risk Severity Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Distribution by status and critical risk alert
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Total Risks</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{totalRisks}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="text-xs text-amber-700 uppercase font-semibold">Average Score</div>
                        <div className="text-xl font-bold text-amber-900 mt-1">{avgRiskScore.toFixed(1)} / 9</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-600">Open Risks</span>
                        <span className="font-semibold text-slate-900">{openRisks}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-600">Mitigating Actions Active</span>
                        <span className="font-semibold text-slate-900">{mitigatingRisks}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                        <span className="text-slate-600">Resolved / Closed</span>
                        <span className="font-semibold text-slate-900">{resolvedRisks + (risksReport?.byStatus?.CLOSED ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-rose-600 font-medium">Critical Risks (Score ≥ 6)</span>
                        <span className="font-bold text-rose-700">{highScoreRisks}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 2: TASKS DETAILED REPORT */}
            {activeTab === 'tasks' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Status Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" />
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
                            <span className="font-medium text-slate-700">{s.label}</span>
                            <span className="text-slate-500 font-mono">{s.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`${s.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Priority Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-rose-600" />
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
                            <span className="font-medium text-slate-700">{p.label} Priority</span>
                            <span className="text-slate-500 font-mono">{p.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`${p.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: SPRINTS DETAILED REPORT */}
            {activeTab === 'sprints' && (
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    Sprint Lifecycle Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current sprint iterations and status distribution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
                      <div className="text-xs text-slate-500 font-medium">PLANNED</div>
                      <div className="text-2xl font-bold text-slate-800 mt-1">{plannedSprints}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 text-center">
                      <div className="text-xs text-blue-700 font-medium">ACTIVE</div>
                      <div className="text-2xl font-bold text-blue-900 mt-1">{activeSprints}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 text-center">
                      <div className="text-xs text-emerald-700 font-medium">COMPLETED</div>
                      <div className="text-2xl font-bold text-emerald-900 mt-1">{completedSprints}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
                      <div className="text-xs text-slate-500 font-medium">CANCELLED</div>
                      <div className="text-2xl font-bold text-slate-800 mt-1">{cancelledSprints}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB 4: RISKS DETAILED REPORT */}
            {activeTab === 'risks' && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Status Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'OPEN', count: openRisks, color: 'text-rose-600' },
                      { label: 'MITIGATING', count: mitigatingRisks, color: 'text-amber-600' },
                      { label: 'RESOLVED', count: resolvedRisks, color: 'text-emerald-600' },
                      { label: 'ACCEPTED', count: risksReport?.byStatus?.ACCEPTED ?? 0, color: 'text-blue-600' },
                      { label: 'CLOSED', count: risksReport?.byStatus?.CLOSED ?? 0, color: 'text-slate-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Probability Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Probability Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'HIGH Probability', count: risksReport?.byProbability?.HIGH ?? 0, color: 'text-rose-600' },
                      { label: 'MEDIUM Probability', count: risksReport?.byProbability?.MEDIUM ?? 0, color: 'text-amber-600' },
                      { label: 'LOW Probability', count: risksReport?.byProbability?.LOW ?? 0, color: 'text-slate-600' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Impact Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Impact Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'HIGH Impact', count: risksReport?.byImpact?.HIGH ?? 0, color: 'text-rose-600' },
                      { label: 'MEDIUM Impact', count: risksReport?.byImpact?.MEDIUM ?? 0, color: 'text-amber-600' },
                      { label: 'LOW Impact', count: risksReport?.byImpact?.LOW ?? 0, color: 'text-slate-600' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">{item.label}</span>
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
    </AppShell>
  );
}
