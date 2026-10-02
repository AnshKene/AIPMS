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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  'flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA_CLASS =
  'flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none';

// ─── Types ────────────────────────────────────────────────────────────────────

type BaseTaskFormProps = {
  /** Available for create mode — pre-fill project */
  defaultProjectId?: string;
  /** Render the trigger element */
  trigger: React.ReactNode;
  /** Called after successful submission */
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
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  teamId: string;
  startDate: string;
  dueDate: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps) {
  const { mode, defaultProjectId, task, trigger, onSuccess } = props;
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showMore, setShowMore] = React.useState(false);

  const initialState = React.useCallback(
    (): FormState => ({
      title: task?.title ?? '',
      projectId: task?.projectId ?? defaultProjectId ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'TODO',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assigneeId ?? '',
      teamId: task?.teamId ?? '',
      startDate: toDateInput(task?.startDate),
      dueDate: toDateInput(task?.dueDate),
    }),
    [task, defaultProjectId],
  );

  const [form, setForm] = React.useState<FormState>(initialState);

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
      setError('Project ID is required.');
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
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'create'
              ? 'Create a task and start tracking project work.'
              : 'Update the task details below.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="task-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Task title"
              maxLength={255}
              disabled={submitting}
              autoFocus
              required
            />
          </div>

          {/* Project ID (create only) */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label htmlFor="task-project" className="block text-sm font-medium text-slate-700">
                Project ID <span className="text-red-500">*</span>
              </label>
              <Input
                id="task-project"
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={submitting}
                required
              />
              <p className="text-[11px] text-slate-400">Paste the UUID of the target project.</p>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1.5">
            <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700">
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

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <Input
              id="task-due-date"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none"
          >
            {showMore ? '− Fewer options' : '+ More options'}
          </button>

          {showMore && (
            <div className="space-y-4 pt-1">
              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Optional description"
                  disabled={submitting}
                  rows={3}
                  className={TEXTAREA_CLASS}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label htmlFor="task-status" className="block text-sm font-medium text-slate-700">
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

              {/* Assignee ID */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-assignee"
                  className="block text-sm font-medium text-slate-700"
                >
                  Assignee ID
                </label>
                <Input
                  id="task-assignee"
                  name="assigneeId"
                  value={form.assigneeId}
                  onChange={handleChange}
                  placeholder="User UUID (optional)"
                  disabled={submitting}
                />
              </div>

              {/* Team ID */}
              <div className="space-y-1.5">
                <label htmlFor="task-team" className="block text-sm font-medium text-slate-700">
                  Team ID
                </label>
                <Input
                  id="task-team"
                  name="teamId"
                  value={form.teamId}
                  onChange={handleChange}
                  placeholder="Team UUID (optional)"
                  disabled={submitting}
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-start-date"
                  className="block text-sm font-medium text-slate-700"
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
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
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
