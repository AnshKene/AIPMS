'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectIntelligence } from '@/components/projects/ProjectIntelligence';
import { NotFoundState, ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Loader2,
  Pencil,
  Archive,
  ArchiveRestore,
  FolderKanban,
  CalendarDays,
  User,
  Zap,
  CheckCircle2,
  ListTodo,
  ShieldAlert,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  getProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  type Project,
  type UpdateProjectPayload,
} from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { listSprints, type Sprint } from '@/lib/api/sprints';
import { listRisks, type Risk } from '@/lib/api/risks';
import { listTeams, type Team } from '@/lib/api/teams';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Archive Confirm Component ──────────────────────────────────────────────

function ArchiveButton({
  projectId,
  projectName,
  disabled,
  onArchived,
}: {
  projectId: string;
  projectName: string;
  disabled: boolean;
  onArchived: (project: Project) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const result = await archiveProject(projectId);
      onArchived(result);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project.');
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        id="archive-project-btn"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800/80 dark:text-amber-400 dark:hover:bg-amber-950/30"
      >
        <Archive className="h-4 w-4" />
        Archive Project
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 text-left">
      <p className="text-xs text-amber-900 dark:text-amber-200">
        Archive <span className="font-semibold">&ldquo;{projectName}&rdquo;</span>? This sets status to ARCHIVED.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          id="archive-confirm-btn"
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={handleArchive}
          className="gap-1.5 h-8 text-xs"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Confirm Archive
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Unarchive Button Component ─────────────────────────────────────────────

function UnarchiveButton({
  projectId,
  projectName,
  onUnarchived,
}: {
  projectId: string;
  projectName: string;
  onUnarchived: (project: Project) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUnarchive() {
    setLoading(true);
    setError(null);
    try {
      const result = await unarchiveProject(projectId);
      onUnarchived(result);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unarchive project.');
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        id="unarchive-project-btn"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <ArchiveRestore className="h-4 w-4" />
        Unarchive
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-left">
      <p className="text-xs text-blue-900 dark:text-blue-200">
        Restore <span className="font-semibold">&ldquo;{projectName}&rdquo;</span> to active status?
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          id="unarchive-confirm-btn"
          size="sm"
          disabled={loading}
          onClick={handleUnarchive}
          className="gap-1.5 h-8 text-xs"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          Confirm Restore
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Project Detail Page ───────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();

  const canManageProject = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [project, setProject] = React.useState<Project | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [sprints, setSprints] = React.useState<Sprint[]>([]);
  const [risks, setRisks] = React.useState<Risk[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    async function fetchAllProjectData() {
      setLoading(true);
      setError(null);
      try {
        const [projRes, tasksRes, sprintsRes, risksRes, teamsRes] = await Promise.allSettled([
          getProject(id),
          listTasks({ projectId: id, limit: 200 }),
          listSprints({ projectId: id }),
          listRisks({ projectId: id }),
          listTeams(),
        ]);

        if (isCancelled) return;

        if (projRes.status === 'fulfilled') {
          setProject(projRes.value);
          setNotFound(false);
        } else {
          const msg = projRes.reason instanceof Error ? projRes.reason.message : 'Failed to load project.';
          if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
            setNotFound(true);
            return;
          }
          throw projRes.reason;
        }

        if (tasksRes.status === 'fulfilled') {
          setTasks(tasksRes.value.data);
        }

        if (sprintsRes.status === 'fulfilled') {
          setSprints(sprintsRes.value);
        }

        if (risksRes.status === 'fulfilled') {
          setRisks(risksRes.value);
        }

        if (teamsRes.status === 'fulfilled') {
          setTeams(teamsRes.value.data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project details.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchAllProjectData();

    return () => {
      isCancelled = true;
    };
  }, [id, refreshKey]);

  function handleRetry() {
    setRefreshKey((k) => k + 1);
  }

  function handleUpdated(updated: Project) {
    setProject(updated);
  }

  function handleArchived(archived: Project) {
    setProject(archived);
  }

  const isArchived = project?.status === 'ARCHIVED';

  // Task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Active sprint
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE') || sprints[0];

  // Active open risks
  const openRisks = risks.filter((r) => r.status !== 'CLOSED' && r.status !== 'RESOLVED');

  // Loading state skeleton
  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-7xl animate-pulse">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="space-y-2 flex-1">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
            <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
            <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
          </div>
        </div>
      </AppShell>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <AppShell>
        <div className="py-12">
          <NotFoundState
            title="Project Not Found"
            description="The requested project identifier does not exist or has been removed."
            backLink="/projects"
            backLinkLabel="Return to Projects Workspace"
          />
        </div>
      </AppShell>
    );
  }

  // Error State
  if (error || !project) {
    return (
      <AppShell>
        <div className="py-12">
          <ErrorState
            title="Unable to load project details"
            error={error || 'Project data is unavailable.'}
            onRetry={handleRetry}
            variant="card"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link href="/projects" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-xs">{project.name}</span>
        </div>

        {/* Project Identity Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 shrink-0">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{project.name}</h1>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                  ID: {project.id}
                </p>
              </div>
            </div>
            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl pt-1">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Toolbar (RBAC protected) */}
          {canManageProject && (
            <div className="flex items-center gap-2 shrink-0">
              {!isArchived && (
                <ProjectForm
                  mode="edit"
                  project={project}
                  trigger={
                    <Button id="edit-project-btn" size="sm" variant="outline" className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Project
                    </Button>
                  }
                  onSubmit={(payload) => updateProject(project.id, payload as UpdateProjectPayload)}
                  onSuccess={handleUpdated}
                />
              )}

              {!isArchived ? (
                <ArchiveButton
                  projectId={project.id}
                  projectName={project.name}
                  disabled={isArchived}
                  onArchived={handleArchived}
                />
              ) : (
                <UnarchiveButton
                  projectId={project.id}
                  projectName={project.name}
                  onUnarchived={handleArchived}
                />
              )}
            </div>
          )}
        </div>

        {/* Archived Banner */}
        {isArchived && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  This project is currently archived.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  All tasks, sprints, and risk data are read-only. Unarchive to make updates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Overview Bar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Progress</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {totalTasks > 0 ? `${progressPercent}%` : 'No tasks'}
                </p>
              </div>
            </div>
            {totalTasks > 0 && (
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {project.startDate ? formatDate(project.startDate) : 'Not set'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              End: {project.endDate ? formatDate(project.endDate) : 'Unscheduled'}
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Project Owner</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate max-w-[120px]">
                  {project.ownerId}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              Created: {formatDate(project.createdAt)}
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Risk Exposure</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {openRisks.length} {openRisks.length === 1 ? 'Open Risk' : 'Open Risks'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              {openRisks.length > 0 ? 'Requires attention' : 'Clean risk ledger'}
            </p>
          </Card>
        </div>

        {/* Main Grid Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left / Middle Columns (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Sprint Widget */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Current Sprint
                  </CardTitle>
                </div>
                <Link
                  href={`/sprints?projectId=${project.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  View Sprints
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {activeSprint ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activeSprint.name}
                        </h4>
                        {activeSprint.goal && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Goal: {activeSprint.goal}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {activeSprint.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Timeline: {formatDate(activeSprint.startDate)} – {formatDate(activeSprint.endDate)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-sm font-medium">No active sprint</p>
                    <p className="text-xs mt-1 text-slate-500">
                      Plan or activate a sprint to track sprint iterations.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Summary Breakdown */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Task Distribution
                  </CardTitle>
                </div>
                <Link
                  href={`/tasks?projectId=${project.id}`}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
                >
                  View All Tasks ({totalTasks})
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">To Do</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">{todoTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-center">
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono mt-0.5">{inProgressTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-center">
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Done</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">{completedTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-center">
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Blocked</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono mt-0.5">{blockedTasks}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-center col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Total</p>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300 font-mono mt-0.5">{totalTasks}</p>
                  </div>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Tasks</p>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tasks.slice(0, 4).map((t) => (
                        <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-sm">
                            {t.title}
                          </span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">No tasks created for this project yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Risk ledger */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Risk Ledger
                  </CardTitle>
                </div>
                <Link
                  href={`/risks?projectId=${project.id}`}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
                >
                  View All Risks ({risks.length})
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {openRisks.length > 0 ? (
                  <div className="space-y-3">
                    {openRisks.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{r.title}</p>
                          {r.mitigationPlan && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              Plan: {r.mitigationPlan}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            Score: {r.riskScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-sm font-medium">No active risks</p>
                    <p className="text-xs mt-1 text-slate-500">
                      No active or unmitigated risks recorded for this project.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1/3 width on desktop): AI Intelligence & Team Context */}
          <div className="space-y-6">
            {/* AI Intelligence Panel */}
            <ProjectIntelligence projectId={project.id} projectName={project.name} />

            {/* Team Context Widget */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Team Workspace
                  </CardTitle>
                </div>
                <Link
                  href="/teams"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  Teams
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {teams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {teams.length} team{teams.length > 1 ? 's' : ''} available in workspace:
                    </p>
                    {teams.slice(0, 3).map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="block p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{team.name}</p>
                        {team.description && (
                          <p className="text-[11px] text-slate-400 truncate">{team.description}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No teams assigned yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

