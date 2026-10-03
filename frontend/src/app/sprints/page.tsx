'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  listSprints,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  cancelSprint,
  deleteSprint,
  type Sprint,
  type CreateSprintPayload,
  type UpdateSprintPayload,
  formatSprintError,
} from '@/lib/api/sprints';
import { listProjects, type Project } from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { ActiveSprintCard, SprintCard } from '@/components/sprints/sprint-card';
import { SprintForm } from '@/components/sprints/sprint-form';
import { SprintWorkspace } from '@/components/sprints/sprint-workspace';
import {
  Zap,
  Plus,
  Search,
  FolderKanban,
  AlertCircle,
  X,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function SprintsPage() {
  const [sprints, setSprints] = React.useState<Sprint[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectMap, setProjectMap] = React.useState<Record<string, string>>({});
  const [tasks, setTasks] = React.useState<Task[]>([]);

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Focused Sprint Workspace view ID
  const [focusedSprintId, setFocusedSprintId] = React.useState<string | null>(null);

  // Edit Sprint state
  const [editingSprint, setEditingSprint] = React.useState<Sprint | null>(null);

  // Confirmation dialogs state
  const [startingSprint, setStartingSprint] = React.useState<Sprint | null>(null);
  const [completingSprint, setCompletingSprint] = React.useState<Sprint | null>(null);
  const [cancellingSprint, setCancellingSprint] = React.useState<Sprint | null>(null);
  const [deletingSprint, setDeletingSprint] = React.useState<Sprint | null>(null);

  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Load projects
  React.useEffect(() => {
    let cancelled = false;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!cancelled) {
          const projs = res.data || [];
          setProjects(projs);
          const map: Record<string, string> = {};
          projs.forEach((p) => {
            map[p.id] = p.name;
          });
          setProjectMap(map);
        }
      })
      .catch(() => {
        // Silently handle
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Sprints & Tasks
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sprintsRes, tasksRes] = await Promise.all([
        listSprints({
          projectId: selectedProjectId || undefined,
        }),
        listTasks({
          projectId: selectedProjectId || undefined,
          limit: 100,
        }),
      ]);

      setSprints(sprintsRes || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      setError(formatSprintError(err, 'Failed to load sprints.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [sprintsRes, tasksRes] = await Promise.all([
          listSprints({
            projectId: selectedProjectId || undefined,
          }),
          listTasks({
            projectId: selectedProjectId || undefined,
            limit: 100,
          }),
        ]);
        if (active) {
          setSprints(sprintsRes || []);
          setTasks(tasksRes.data || []);
        }
      } catch (err) {
        if (active) {
          setError(formatSprintError(err, 'Failed to load sprints.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  // Derive focused sprint automatically
  const focusedSprint = React.useMemo(() => {
    if (!focusedSprintId) return null;
    return sprints.find((s) => s.id === focusedSprintId) ?? null;
  }, [focusedSprintId, sprints]);

  // Client-side search & status filtering
  const filteredSprints = React.useMemo(() => {
    return sprints.filter((sprint) => {
      // Status filter
      if (selectedStatusFilter !== 'ALL' && sprint.status !== selectedStatusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = sprint.name.toLowerCase().includes(q);
        const goalMatch = sprint.goal?.toLowerCase().includes(q) ?? false;
        const projName = projectMap[sprint.projectId]?.toLowerCase() ?? '';
        const projMatch = projName.includes(q);
        if (!nameMatch && !goalMatch && !projMatch) {
          return false;
        }
      }
      return true;
    });
  }, [sprints, selectedStatusFilter, searchQuery, projectMap]);

  // Categorize sprints
  const activeSprints = React.useMemo(
    () => filteredSprints.filter((s) => s.status === 'ACTIVE'),
    [filteredSprints],
  );

  const plannedSprints = React.useMemo(
    () => filteredSprints.filter((s) => s.status === 'PLANNED'),
    [filteredSprints],
  );

  const completedSprints = React.useMemo(
    () => filteredSprints.filter((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED'),
    [filteredSprints],
  );

  // Sprint Mutation Handlers
  function handleSprintCreated(newSprint: Sprint) {
    setSprints((prev) => [newSprint, ...prev]);
    setFocusedSprintId(newSprint.id);
  }

  function handleSprintUpdated(updated: Sprint) {
    setSprints((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  // Lifecycle Action Handlers
  async function handleConfirmStart() {
    if (!startingSprint) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await startSprint(startingSprint.id);
      handleSprintUpdated(updated);
      setStartingSprint(null);
    } catch (err) {
      setActionError(formatSprintError(err, 'Failed to start sprint.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmComplete() {
    if (!completingSprint) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await completeSprint(completingSprint.id);
      handleSprintUpdated(updated);
      setCompletingSprint(null);
    } catch (err) {
      setActionError(formatSprintError(err, 'Failed to complete sprint.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingSprint) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await cancelSprint(cancellingSprint.id);
      handleSprintUpdated(updated);
      setCancellingSprint(null);
    } catch (err) {
      setActionError(formatSprintError(err, 'Failed to cancel sprint.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingSprint) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteSprint(deletingSprint.id);
      setSprints((prev) => prev.filter((s) => s.id !== deletingSprint.id));
      if (focusedSprintId === deletingSprint.id) {
        setFocusedSprintId(null);
      }
      // Revert sprint tasks to backlog locally
      setTasks((prev) =>
        prev.map((t) => (t.sprintId === deletingSprint.id ? { ...t, sprintId: null } : t)),
      );
      setDeletingSprint(null);
    } catch (err) {
      setActionError(formatSprintError(err, 'Failed to delete sprint.'));
    } finally {
      setActionLoading(false);
    }
  }

  // Task synchronization handlers from workspace
  function handleTaskUpdated(updatedTask: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }

  function handleTaskCreated(newTask: Task) {
    setTasks((prev) => [newTask, ...prev]);
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <AppShell>
      {focusedSprint ? (
        /* Focused Sprint Workspace View */
        <SprintWorkspace
          sprint={focusedSprint}
          allProjectTasks={tasks}
          allProjectSprints={sprints}
          projectName={projectMap[focusedSprint.projectId]}
          onBack={() => setFocusedSprintId(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskCreated={handleTaskCreated}
          onTaskDeleted={handleTaskDeleted}
        />
      ) : (
        /* Main Sprints Dashboard View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <Zap className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sprint Management
                </h1>
                <Badge variant="info">Sprint Service</Badge>
              </div>
              <p className="text-sm text-slate-500">
                Plan iterations, monitor active velocity, and track delivery progress across your projects.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <SprintForm
                mode="create"
                projects={projects}
                defaultProjectId={selectedProjectId}
                trigger={
                  <Button size="sm" className="gap-1.5 shadow-xs">
                    <Plus className="h-4 w-4" />
                    Create Sprint
                  </Button>
                }
                onSubmit={(payload) => createSprint(payload as CreateSprintPayload)}
                onSuccess={handleSprintCreated}
              />
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search sprints by name, goal, or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs"
                  aria-label="Search sprints"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  aria-label="Filter by project"
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  aria-label="Filter by sprint status"
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PLANNED">Planned</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
              {searchQuery || selectedStatusFilter !== 'ALL'
                ? `${filteredSprints.length} of ${sprints.length} sprints match`
                : `${sprints.length} ${sprints.length === 1 ? 'sprint' : 'sprints'} total`}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="ml-auto text-xs h-7 bg-white"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-24 bg-slate-100 rounded" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-12 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredSprints.length === 0 ? (
            /* Empty State */
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mx-auto">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || selectedStatusFilter !== 'ALL'
                  ? 'No sprints match your filter'
                  : 'No sprints created yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedStatusFilter !== 'ALL'
                  ? 'Try clearing your search query or selecting a different status filter.'
                  : 'Plan your iterations with target dates and goals to track team delivery velocity.'}
              </p>
              {searchQuery || selectedStatusFilter !== 'ALL' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatusFilter('ALL');
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              ) : (
                <SprintForm
                  mode="create"
                  projects={projects}
                  defaultProjectId={selectedProjectId}
                  trigger={
                    <Button size="sm" className="gap-1.5 mt-2">
                      <Plus className="h-4 w-4" />
                      Create First Sprint
                    </Button>
                  }
                  onSubmit={(payload) => createSprint(payload as CreateSprintPayload)}
                  onSuccess={handleSprintCreated}
                />
              )}
            </div>
          ) : (
            /* Sprints Sections */
            <div className="space-y-8">
              {/* Active Sprint Section */}
              {activeSprints.length > 0 && (
                <section className="space-y-3" aria-labelledby="active-sprint-heading">
                  <h2 id="active-sprint-heading" className="sr-only">
                    Active Sprint
                  </h2>
                  <div className="space-y-4">
                    {activeSprints.map((sprint) => (
                      <ActiveSprintCard
                        key={sprint.id}
                        sprint={sprint}
                        tasks={tasks}
                        projectName={projectMap[sprint.projectId]}
                        onOpenWorkspace={(s) => setFocusedSprintId(s.id)}
                        onComplete={(s) => setCompletingSprint(s)}
                        onCancel={(s) => setCancellingSprint(s)}
                        onEdit={(s) => setEditingSprint(s)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Planned Sprints Section */}
              {plannedSprints.length > 0 && (
                <section className="space-y-3" aria-labelledby="planned-sprints-heading">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <h2
                      id="planned-sprints-heading"
                      className="text-sm font-bold text-slate-900 uppercase tracking-wider"
                    >
                      Planned Sprints ({plannedSprints.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plannedSprints.map((sprint) => (
                      <SprintCard
                        key={sprint.id}
                        sprint={sprint}
                        tasks={tasks}
                        projectName={projectMap[sprint.projectId]}
                        onOpenWorkspace={(s) => setFocusedSprintId(s.id)}
                        onStart={(s) => setStartingSprint(s)}
                        onEdit={(s) => setEditingSprint(s)}
                        onDelete={(s) => setDeletingSprint(s)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed / Cancelled Sprints Section */}
              {completedSprints.length > 0 && (
                <section className="space-y-3" aria-labelledby="past-sprints-heading">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h2
                      id="past-sprints-heading"
                      className="text-sm font-bold text-slate-900 uppercase tracking-wider"
                    >
                      Completed & Past Iterations ({completedSprints.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedSprints.map((sprint) => (
                      <SprintCard
                        key={sprint.id}
                        sprint={sprint}
                        tasks={tasks}
                        projectName={projectMap[sprint.projectId]}
                        onOpenWorkspace={(s) => setFocusedSprintId(s.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Edit Sprint Sheet */}
          <SprintForm
            mode="edit"
            sprint={editingSprint}
            open={editingSprint !== null}
            onOpenChange={(isOpen) => {
              if (!isOpen) setEditingSprint(null);
            }}
            onSubmit={(payload) =>
              updateSprint(editingSprint!.id, payload as UpdateSprintPayload)
            }
            onSuccess={(updated) => {
              handleSprintUpdated(updated);
              setEditingSprint(null);
            }}
          />

          {/* Confirm Dialog: Start Sprint */}
          <ConfirmDialog
            open={startingSprint !== null}
            onOpenChange={(open) => {
              if (!open) setStartingSprint(null);
            }}
            title={`Start "${startingSprint?.name}"?`}
            description="Starting this sprint will set its status to ACTIVE and make it the active delivery iteration for this project."
            confirmLabel="Start Sprint"
            variant="default"
            loading={actionLoading}
            error={actionError}
            onConfirm={handleConfirmStart}
          />

          {/* Confirm Dialog: Complete Sprint */}
          <ConfirmDialog
            open={completingSprint !== null}
            onOpenChange={(open) => {
              if (!open) setCompletingSprint(null);
            }}
            title={`Complete "${completingSprint?.name}"?`}
            description="Completing this sprint will finalize all task progress records and transition it to COMPLETED. Any incomplete tasks will remain in this sprint record or can be reallocated."
            confirmLabel="Complete Sprint"
            variant="default"
            loading={actionLoading}
            error={actionError}
            onConfirm={handleConfirmComplete}
          />

          {/* Confirm Dialog: Cancel Sprint */}
          <ConfirmDialog
            open={cancellingSprint !== null}
            onOpenChange={(open) => {
              if (!open) setCancellingSprint(null);
            }}
            title={`Cancel "${cancellingSprint?.name}"?`}
            description="Cancelling this sprint will transition it to CANCELLED. This action stops the current iteration."
            confirmLabel="Cancel Sprint"
            variant="destructive"
            loading={actionLoading}
            error={actionError}
            onConfirm={handleConfirmCancel}
          />

          {/* Confirm Dialog: Delete Planned Sprint */}
          <ConfirmDialog
            open={deletingSprint !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingSprint(null);
            }}
            title={`Delete "${deletingSprint?.name}"?`}
            description="This will delete the planned sprint. All assigned tasks will be preserved and safely returned to the project backlog. This action cannot be undone."
            confirmLabel="Delete Sprint"
            variant="destructive"
            loading={actionLoading}
            error={actionError}
            onConfirm={handleConfirmDelete}
          />
        </div>
      )}
    </AppShell>
  );
}
