'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/tasks/task-badges';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskDetail } from '@/components/tasks/task-detail';
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
import {
  CheckSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  User,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Board Column ─────────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-2 min-w-[220px] flex-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={status} />
          <span className="text-xs text-slate-400 font-medium">{tasks.length}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px] rounded-lg bg-slate-50 border border-slate-100 p-2">
        {tasks.length === 0 && (
          <p className="text-xs text-slate-300 text-center pt-4">Empty</p>
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
                className="rounded-md border border-slate-200 bg-white p-3 text-left shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 space-y-2"
                aria-label={`Open task: ${task.title}`}
              >
                <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                  {task.title}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <TaskPriorityBadge priority={task.priority} />
                  {task.dueDate && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 animate-pulse">
      <div className="h-3.5 w-56 bg-slate-200 rounded" />
      <div className="ml-auto flex items-center gap-6">
        <div className="h-5 w-20 bg-slate-100 rounded" />
        <div className="h-3.5 w-12 bg-slate-100 rounded" />
        <div className="h-3.5 w-24 bg-slate-100 rounded" />
        <div className="h-3.5 w-16 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <CheckSquare className="h-10 w-10 text-slate-200" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">
          {filtered ? 'No tasks match these filters' : 'No tasks yet'}
        </p>
        <p className="text-xs text-slate-400">
          {filtered
            ? 'Try adjusting your search or filters.'
            : 'Create your first task to start tracking project work.'}
        </p>
      </div>
      {filtered && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="mt-1 text-xs"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'list' | 'board';

export default function TasksPage() {
  // State
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

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | ''>('');

  const isFiltered = Boolean(search || statusFilter || priorityFilter);

  // Data fetching
  React.useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      try {
        const res = await listTasks({
          page,
          limit: PAGE_LIMIT,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        if (!cancelled) {
          setTasks(res.data);
          setMeta(res.meta);
          setError(null);
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
  }, [page, statusFilter, priorityFilter, refreshKey]);

  // Client-side search filter (fast, no extra request)
  const visibleTasks = React.useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  // Handlers
  function handleTaskCreated() {
    setPage(1);
    setRefreshKey((k) => k + 1);
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
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

  function handleStatusFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value as TaskStatus | '');
    setPage(1);
  }

  function handlePriorityFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPriorityFilter(e.target.value as TaskPriority | '');
    setPage(1);
  }

  // Board view: group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const map: Partial<Record<TaskStatus, Task[]>> = {};
    for (const s of BOARD_COLUMNS) map[s] = [];
    for (const t of visibleTasks) {
      (map[t.status] ??= []).push(t);
    }
    return map;
  }, [visibleTasks]);

  const SELECT_CLASS =
    'h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent';

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Tasks</h1>
            </div>
            <p className="text-sm text-slate-500">
              Manage and track project work.
              {meta.total > 0 && (
                <span className="ml-1 text-slate-400">
                  {meta.total} task{meta.total !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <TaskForm
            mode="create"
            trigger={
              <Button size="sm" className="gap-1.5" id="create-task-btn">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            }
            onSubmit={createTask}
            onSuccess={handleTaskCreated}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
            />
          </div>

          {/* Status filter */}
          <select
            id="tasks-status-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            aria-label="Filter by status"
            className={SELECT_CLASS}
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            id="tasks-priority-filter"
            value={priorityFilter}
            onChange={handlePriorityFilterChange}
            aria-label="Filter by priority"
            className={SELECT_CLASS}
          >
            <option value="">All priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>

          {/* View switcher */}
          <div className="flex items-center gap-1 ml-auto rounded-md border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              aria-label="Board view"
              aria-pressed={view === 'board'}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                view === 'board'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
            aria-label="Loading tasks"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center space-y-2">
            <p className="text-sm font-semibold text-red-700">Failed to load tasks</p>
            <p className="text-xs text-red-500">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && visibleTasks.length === 0 && (
          <EmptyState filtered={isFiltered} onClearFilters={clearFilters} />
        )}

        {/* LIST VIEW */}
        {!loading && !error && visibleTasks.length > 0 && view === 'list' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_100px_120px_100px] gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Task</span>
              <span className="hidden sm:block">Status</span>
              <span className="hidden sm:block">Priority</span>
              <span className="hidden sm:block">Due Date</span>
              <span className="hidden sm:block">Assignee</span>
            </div>

            {/* Rows */}
            {visibleTasks.map((task) => (
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
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_100px_120px_100px] gap-4 items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-blue-600 group"
                  >
                    {/* Title */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5 hidden sm:block">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="hidden sm:flex">
                      <TaskStatusBadge status={task.status} />
                    </div>

                    {/* Priority */}
                    <div className="hidden sm:flex">
                      <TaskPriorityBadge priority={task.priority} />
                    </div>

                    {/* Due Date */}
                    <div className="hidden sm:block">
                      {task.dueDate ? (
                        <span className="text-xs text-slate-600 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    {/* Assignee */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {task.assigneeId ? (
                        <>
                          <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-xs text-slate-500 truncate font-mono">
                            {task.assigneeId.slice(0, 8)}…
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    {/* Mobile: status badge on right */}
                    <div className="sm:hidden">
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        )}

        {/* BOARD VIEW */}
        {!loading && !error && view === 'board' && (
          <div className="flex gap-3 overflow-x-auto pb-2">
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

        {/* Pagination (list view only) */}
        {!loading && !error && view === 'list' && meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} task
              {meta.total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                id="tasks-prev-page"
                size="sm"
                variant="outline"
                onClick={() => { setPage((p) => p - 1); setLoading(true); }}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-600 font-medium min-w-[4rem] text-center">
                Page {meta.page} / {meta.totalPages}
              </span>
              <Button
                id="tasks-next-page"
                size="sm"
                variant="outline"
                onClick={() => { setPage((p) => p + 1); setLoading(true); }}
                disabled={page >= meta.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
