'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from '@/lib/api/tasks';
import { listProjects, type Project } from '@/lib/api/projects';
import { listSprints, type Sprint } from '@/lib/api/sprints';

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

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toISOString(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(d).toISOString();
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-sm text-slate-900 dark:text-slate-100 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA_CLASS =
  'flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 resize-none';

type BaseTaskFormProps = {
  defaultProjectId?: string;
  defaultSprintId?: string;
  trigger: React.ReactNode;
  onSuccess: (task: Task) => void;
};

type CreateTaskFormProps = BaseTaskFormProps & {
  mode: 'create';
  task?: undefined;
  onSubmit: (payload: CreateTaskPayload) => Promise<Task>;
};

type EditTaskFormProps = BaseTaskFormProps & {
  mode: 'edit';
  task: Task;
  onSubmit: (payload: UpdateTaskPayload) => Promise<Task>;
};

export type TaskFormProps = CreateTaskFormProps | EditTaskFormProps;

interface FormState {
  title: string;
  projectId: string;
  sprintId: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  teamId: string;
  startDate: string;
  dueDate: string;
}

export function TaskForm(props: TaskFormProps) {
  const { mode, defaultProjectId, defaultSprintId, task, trigger, onSuccess } = props;
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showMore, setShowMore] = React.useState(false);

  // External project & sprint lookup
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [sprints, setSprints] = React.useState<Sprint[]>([]);

  const initialState = React.useCallback(
    (): FormState => ({
      title: task?.title ?? '',
      projectId: task?.projectId ?? defaultProjectId ?? '',
      sprintId: task?.sprintId ?? defaultSprintId ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assigneeId ?? '',
      teamId: task?.teamId ?? '',
      startDate: toDateInput(task?.startDate),
      dueDate: toDateInput(task?.dueDate),
    }),
    [task, defaultProjectId, defaultSprintId],
  );

  const [form, setForm] = React.useState<FormState>(initialState);

  // Fetch projects and sprints when sheet opens
  React.useEffect(() => {
    if (!open) return;
    let isCancelled = false;

    async function loadOptions() {
      try {
        const [projRes, sprintRes] = await Promise.allSettled([
          listProjects({ limit: 100 }),
          listSprints({ limit: 100 }),
        ]);

        if (isCancelled) return;
        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value.data);
        }
        if (sprintRes.status === 'fulfilled') {
          setSprints(sprintRes.value);
        }
      } catch {
        // fail silently for optional dropdowns
      }
    }

    loadOptions();
    return () => {
      isCancelled = true;
    };
  }, [open]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        setForm(initialState());
        setError(null);
        setShowMore(false);
      }
      setOpen(next);
    },
    [initialState],
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (form.title.trim().length > 255) {
      setError('Task title must not exceed 255 characters.');
      return;
    }
    if (mode === 'create' && !form.projectId.trim()) {
      setError('Project selection or ID is required.');
      return;
    }
    if (form.startDate && form.dueDate && new Date(form.dueDate) < new Date(form.startDate)) {
      setError('Due date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      let result: Task;
      if (props.mode === 'create') {
        const createPayload: CreateTaskPayload = {
          projectId: form.projectId.trim(),
          sprintId: form.sprintId.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId.trim() || undefined,
          teamId: form.teamId.trim() || undefined,
          startDate: toISOString(form.startDate),
          dueDate: toISOString(form.dueDate),
        };
        result = await props.onSubmit(createPayload);
      } else {
        const updatePayload: UpdateTaskPayload = {
          sprintId: form.sprintId.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId.trim() || undefined,
          teamId: form.teamId.trim() || undefined,
          startDate: toISOString(form.startDate),
          dueDate: toISOString(form.dueDate),
        };
        result = await props.onSubmit(updatePayload);
      }
      onSuccess(result);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full max-w-md overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'Create Task' : 'Edit Task'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'create'
              ? 'Plan, assign, and configure new work items.'
              : 'Update task properties and schedule.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <Input
              id="task-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Implement payment gateway API"
              maxLength={255}
              disabled={submitting}
              autoFocus
              required
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
            />
          </div>

          {/* Project (create mode) */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label htmlFor="task-project" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Project <span className="text-rose-500">*</span>
              </label>
              {projects.length > 0 ? (
                <select
                  id="task-project"
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  disabled={submitting}
                  className={SELECT_CLASS}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="task-project"
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                  placeholder="Target Project UUID"
                  disabled={submitting}
                  required
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
                />
              )}
            </div>
          )}

          {/* Sprint */}
          <div className="space-y-1.5">
            <label htmlFor="task-sprint" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Sprint
            </label>
            {sprints.length > 0 ? (
              <select
                id="task-sprint"
                name="sprintId"
                value={form.sprintId}
                onChange={handleChange}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                <option value="">No sprint assigned</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="task-sprint"
                name="sprintId"
                value={form.sprintId}
                onChange={handleChange}
                placeholder="Sprint UUID (optional)"
                disabled={submitting}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
              />
            )}
          </div>

          {/* Priority & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="task-priority" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Priority
              </label>
              <select
                id="task-priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Status
              </label>
              <select
                id="task-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                disabled={submitting}
                className={SELECT_CLASS}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="task-due-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Due Date
            </label>
            <Input
              id="task-due-date"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              disabled={submitting}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
            />
          </div>

          {/* More Options Toggle */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
          >
            {showMore ? '− Hide additional options' : '+ Show description & assignment'}
          </button>

          {showMore && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-description"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Task requirements, details, or context..."
                  disabled={submitting}
                  rows={3}
                  className={TEXTAREA_CLASS}
                />
              </div>

              {/* Assignee ID */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-assignee"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  Assignee User ID
                </label>
                <Input
                  id="task-assignee"
                  name="assigneeId"
                  value={form.assigneeId}
                  onChange={handleChange}
                  placeholder="User UUID (optional)"
                  disabled={submitting}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm font-mono"
                />
              </div>

              {/* Team ID */}
              <div className="space-y-1.5">
                <label htmlFor="task-team" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Team ID
                </label>
                <Input
                  id="task-team"
                  name="teamId"
                  value={form.teamId}
                  onChange={handleChange}
                  placeholder="Team UUID (optional)"
                  disabled={submitting}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm font-mono"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-start-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  Start Date
                </label>
                <Input
                  id="task-start-date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  disabled={submitting}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 p-3 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
