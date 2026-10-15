'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/tasks/task-badges';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskDetail } from '@/components/tasks/task-detail';
import { TasksSkeleton } from '@/components/tasks/TasksSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState, FilterEmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import {
  listTasks,
  createTask,
  type Task,
  type TaskListMeta,
  type TaskStatus,
  type TaskPriority,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from '@/lib/api/tasks';
import { getProject, type Project } from '@/lib/api/projects';
import { getSprint, type Sprint } from '@/lib/api/sprints';
import {
  CheckSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  X,
  ArrowUpDown,
  FolderKanban,
  Zap,
  ExternalLink,
} from 'lucide-react';

const PAGE_LIMIT = 25;
const BOARD_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

type SortOption = 'priority_desc' | 'due_asc' | 'title_asc' | 'created_desc';
type View = 'list' | 'board';

function getDueDateStatus(dueDateStr: string | null | undefined): { label: string; color: string } | null {
  if (!dueDateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return { label: 'OVERDUE', color: 'text-rose-600 dark:text-rose-400 font-bold' };
  }
  if (diffDays === 0) {
    return { label: 'DUE TODAY', color: 'text-amber-600 dark:text-amber-400 font-bold' };
  }
  if (diffDays <= 3) {
    return { label: 'DUE SOON', color: 'text-blue-600 dark:text-blue-400 font-semibold' };
  }
  return null;
}

function getAssigneeDisplay(
  id: string | null | undefined,
  currentUserName?: string | null
): { name: string; initials: string; isAssigned: boolean } {
  if (!id) return { name: 'Unassigned', initials: '—', isAssigned: false };
  if (id.startsWith('00000000')) {
    return { name: currentUserName || 'System Admin', initials: 'SA', isAssigned: true };
  }
  return {
    name: `User #${id.slice(0, 4)}`,
    initials: id.slice(0, 2).toUpperCase(),
    isAssigned: true,
  };
}

// ─── Board Column Component ───────────────────────────────────────────────────

function BoardColumn({
  status,
  tasks,
  onTaskUpdated,
  onTaskDeleted,
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] flex-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={status} />
          <span className="text-xs text-slate-400 font-mono font-bold">{tasks.length}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 min-h-[350px] rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 p-2.5">
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400 italic">
            No tasks in {STATUS_LABELS[status]}
          </div>
        )}
        {tasks.map((task) => (
          <TaskDetail
            key={task.id}
            taskId={task.id}
            onTaskUpdated={onTaskUpdated}
            onTaskDeleted={onTaskDeleted}
            trigger={
              <div
                role="button"
                tabIndex={0}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-left shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 space-y-2.5 group"
                aria-label={`Open task: ${task.title}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {task.title}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400 text-[10px]">
                    TASK-{task.id.slice(0, 6)}
                  </span>
                  <TaskPriorityBadge priority={task.priority} />
                </div>

                {task.dueDate && (
                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {getDueDateStatus(task.dueDate) && (
                      <span className={getDueDateStatus(task.dueDate)?.color}>
                        {getDueDateStatus(task.dueDate)?.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─── Inner Tasks Content Component (Uses useSearchParams) ────────────────────

function TasksContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId') || '';
  const sprintIdParam = searchParams.get('sprintId') || '';

  const { user } = useAuth();
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER' || user?.role === 'TEAM_MEMBER';

  // Scope state
  const [activeProject, setActiveProject] = React.useState<Project | null>(null);
  const [activeSprint, setActiveSprint] = React.useState<Sprint | null>(null);

  // Data state
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [meta, setMeta] = React.useState<TaskListMeta>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 1,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<View>('list');

  // Filters & Sort
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | ''>('');
  const [sortBy, setSortBy] = React.useState<SortOption>('priority_desc');

  const isFiltered = Boolean(search || statusFilter || priorityFilter || projectIdParam || sprintIdParam);

  // Fetch scope metadata when query params exist
  React.useEffect(() => {
    let cancelled = false;

    async function loadScope() {
      if (projectIdParam) {
        try {
          const proj = await getProject(projectIdParam);
          if (!cancelled) setActiveProject(proj);
        } catch {
          if (!cancelled) setActiveProject(null);
        }
      } else {
        setActiveProject((prev) => (prev ? null : prev));
      }

      if (sprintIdParam) {
        try {
          const sp = await getSprint(sprintIdParam);
          if (!cancelled) setActiveSprint(sp);
        } catch {
          if (!cancelled) setActiveSprint(null);
        }
      } else {
        setActiveSprint((prev) => (prev ? null : prev));
      }
    }

    loadScope();
    return () => {
      cancelled = true;
    };
  }, [projectIdParam, sprintIdParam]);

  // Main task fetching
  React.useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const res = await listTasks({
          page,
          limit: PAGE_LIMIT,
          projectId: projectIdParam || undefined,
          sprintId: sprintIdParam || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        if (!cancelled) {
          setTasks(res.data);
          setMeta(res.meta);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks.');
          setTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, priorityFilter, projectIdParam, sprintIdParam, refreshKey]);

  // Client-side search and sorting
  const visibleTasks = React.useMemo(() => {
    let result = [...tasks];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.id.toLowerCase().includes(q) ||
          (t.assigneeId && t.assigneeId.toLowerCase().includes(q))
      );
    }

    // Sort logic
    const priorityWeight: Record<TaskPriority, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    result.sort((a, b) => {
      if (sortBy === 'priority_desc') {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === 'due_asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      // created_desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tasks, search, sortBy]);

  // Group tasks by status for board view
  const tasksByStatus = React.useMemo(() => {
    const map: Partial<Record<TaskStatus, Task[]>> = {};
    for (const s of BOARD_COLUMNS) map[s] = [];
    for (const t of visibleTasks) {
      (map[t.status] ??= []).push(t);
    }
    return map;
  }, [visibleTasks]);

  function handleTaskCreated() {
    setPage(1);
    setRefreshKey((k) => k + 1);
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tasks Workspace
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Plan, assign, and track work across your projects.
            {meta.total > 0 && (
              <span className="ml-2 font-mono text-slate-400 dark:text-slate-500">
                ({meta.total} total)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canCreateTask && (
            <TaskForm
              mode="create"
              defaultProjectId={projectIdParam}
              defaultSprintId={sprintIdParam}
              trigger={
                <Button size="sm" className="gap-1.5 shadow-xs font-medium" id="create-task-btn">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              }
              onSubmit={createTask}
              onSuccess={handleTaskCreated}
            />
          )}
        </div>
      </div>

      {/* Scope Context Banners */}
      {(activeProject || activeSprint || projectIdParam || sprintIdParam) && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 text-xs">
          {projectIdParam && (
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Filtered by Project:{' '}
                <strong className="font-bold">{activeProject?.name || projectIdParam}</strong>
              </span>
              <Link
                href={`/projects/${projectIdParam}`}
                className="hover:underline text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-0.5 ml-1"
              >
                View Project <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {sprintIdParam && (
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 border-l border-blue-200 dark:border-blue-900 pl-3">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>
                Filtered by Sprint:{' '}
                <strong className="font-bold">{activeSprint?.name || sprintIdParam}</strong>
              </span>
            </div>
          )}

          <Link
            href="/tasks"
            className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Clear Scope
            <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Toolbar (Search, Filter, Sort, View Switcher) */}
      <div className="flex flex-col gap-3">
        {/* Search Input & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="tasks-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title, description, ID..."
              aria-label="Search tasks"
              className="pl-9 pr-9 text-sm h-10 sm:h-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters, Sort & View Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Filter Dropdowns Grid on Mobile, Flex on Desktop */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
              {/* Status Filter */}
              <select
                id="tasks-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TaskStatus | '');
                  setPage(1);
                }}
                aria-label="Filter by status"
                className="h-10 sm:h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
              >
                <option value="">All Statuses</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                id="tasks-priority-filter"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as TaskPriority | '');
                  setPage(1);
                }}
                aria-label="Filter by priority"
                className="h-10 sm:h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
              >
                <option value="">All Priorities</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort & View Switcher */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </div>
                <select
                  id="tasks-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort tasks"
                  className="h-10 sm:h-9 w-full sm:w-auto pl-8.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                >
                  <option value="priority_desc">Priority (High to Low)</option>
                  <option value="due_asc">Due Date (Earliest)</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="created_desc">Recently Created</option>
                </select>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    view === 'list'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('board')}
                  aria-label="Board view"
                  aria-pressed={view === 'board'}
                  className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    view === 'board'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content States */}
      {loading ? (
        <TasksSkeleton view={view} />
      ) : error ? (
        <ErrorState
          title="Unable to load tasks workspace"
          error={error}
          onRetry={() => setRefreshKey((k) => k + 1)}
          variant="card"
        />
      ) : visibleTasks.length === 0 ? (
        isFiltered ? (
          <FilterEmptyState
            onClearFilters={clearFilters}
            description="No tasks match your current search, status, priority, or project filters."
          />
        ) : (
          <EmptyState
            icon={<CheckSquare className="h-6 w-6" />}
            title="No tasks yet"
            description="Create your first task to start tracking work across your projects and sprints."
            action={
              canCreateTask ? (
                <TaskForm
                  mode="create"
                  defaultProjectId={projectIdParam}
                  defaultSprintId={sprintIdParam}
                  trigger={
                    <Button size="sm" className="gap-1.5" id="create-task-empty-btn">
                      <Plus className="h-4 w-4" />
                      Create Task
                    </Button>
                  }
                  onSubmit={createTask}
                  onSuccess={handleTaskCreated}
                />
              ) : undefined
            }
          />
        )
      ) : (
        <>
          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              {/* ─── MOBILE CARDS VIEW (sm:hidden) ─── */}
              <div className="sm:hidden flex flex-col gap-3">
                {visibleTasks.map((task) => {
                  const dueBadge = getDueDateStatus(task.dueDate);
                  const assignee = getAssigneeDisplay(task.assigneeId, user?.name);
                  const priorityAccentColor =
                    task.priority === 'URGENT'
                      ? 'bg-rose-500'
                      : task.priority === 'HIGH'
                        ? 'bg-amber-500'
                        : task.priority === 'MEDIUM'
                          ? 'bg-blue-500'
                          : 'bg-slate-300 dark:bg-slate-700';

                  return (
                    <TaskDetail
                      key={task.id}
                      taskId={task.id}
                      onTaskUpdated={handleTaskUpdated}
                      onTaskDeleted={handleTaskDeleted}
                      trigger={
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Open task: ${task.title}`}
                          className="group relative flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pl-4.5 shadow-2xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 overflow-hidden"
                        >
                          {/* Priority Left Accent Stripe */}
                          <div
                            className={cn('absolute left-0 top-0 bottom-0 w-1.5', priorityAccentColor)}
                            aria-hidden="true"
                          />

                          {/* Top Row: Task ID & Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                              TASK-{task.id.slice(0, 6)}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <TaskPriorityBadge priority={task.priority} />
                              <TaskStatusBadge status={task.status} />
                            </div>
                          </div>

                          {/* Middle: Title & Description */}
                          <div className="space-y-1">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Bottom Row: Metadata (Due Date & Assignee) */}
                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            {/* Due Date */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {task.dueDate ? (
                                <span className="flex items-center gap-1.5 font-medium truncate">
                                  <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  {dueBadge && (
                                    <span
                                      className={cn(
                                        'text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-tight ml-0.5 border shadow-2xs',
                                        dueBadge.label === 'OVERDUE'
                                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60'
                                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
                                      )}
                                    >
                                      {dueBadge.label}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No due date</span>
                              )}
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {assignee.isAssigned ? (
                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 px-2 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-700/60">
                                  <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[8px] flex items-center justify-center shrink-0 shadow-2xs">
                                    {assignee.initials}
                                  </div>
                                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 max-w-[110px] truncate">
                                    {assignee.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                              )}
                            </div>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </div>

              {/* ─── DESKTOP TABLE VIEW (hidden sm:block) ─── */}
              <div className="hidden sm:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                {/* Desktop Table Header */}
                <div className="grid sm:grid-cols-[1.5fr_120px_100px_130px_120px] gap-4 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Task Title & ID</span>
                  <span>Status</span>
                  <span>Priority</span>
                  <span>Due Date</span>
                  <span>Assignee</span>
                </div>

                {/* Desktop Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {visibleTasks.map((task) => {
                    const dueBadge = getDueDateStatus(task.dueDate);
                    const assignee = getAssigneeDisplay(task.assigneeId, user?.name);
                    return (
                      <TaskDetail
                        key={task.id}
                        taskId={task.id}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDeleted={handleTaskDeleted}
                        trigger={
                          <div
                            role="row"
                            tabIndex={0}
                            aria-label={`Task: ${task.title}`}
                            className="px-4 py-3.5 grid sm:grid-cols-[1.5fr_120px_100px_130px_120px] gap-4 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-blue-600 group"
                          >
                            {/* Column 1: Title & ID */}
                            <div className="min-w-0 w-full">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-semibold text-slate-400 shrink-0">
                                  TASK-{task.id.slice(0, 6)}
                                </span>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {task.title}
                                </p>
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-xl">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Column 2: Status */}
                            <div>
                              <TaskStatusBadge status={task.status} />
                            </div>

                            {/* Column 3: Priority */}
                            <div>
                              <TaskPriorityBadge priority={task.priority} />
                            </div>

                            {/* Column 4: Due Date */}
                            <div className="text-xs">
                              {task.dueDate ? (
                                <div className="flex flex-col">
                                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  {dueBadge && (
                                    <span className={`text-[10px] ${dueBadge.color}`}>
                                      {dueBadge.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </div>

                            {/* Column 5: Assignee */}
                            <div className="text-xs">
                              {assignee.isAssigned ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[8px] flex items-center justify-center shrink-0 shadow-2xs">
                                    {assignee.initials}
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
                                    {assignee.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Unassigned</span>
                              )}
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BOARD VIEW */}
          {view === 'board' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {BOARD_COLUMNS.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  tasks={tasksByStatus[status] ?? []}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleTaskDeleted}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Showing {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} task
                {meta.total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  id="tasks-prev-page"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium min-w-[4rem] text-center">
                  Page {meta.page} / {meta.totalPages}
                </span>
                <Button
                  id="tasks-next-page"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Export Page Component wrapped in Suspense ─────────────────────────────

export default function TasksPage() {
  return (
    <AppShell>
      <React.Suspense fallback={<TasksSkeleton />}>
        <TasksContent />
      </React.Suspense>
    </AppShell>
  );
}
