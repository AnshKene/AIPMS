'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TaskPriorityBadge } from './task-badges';
import { TaskForm } from './task-form';
import { TaskDependencies } from './task-dependencies';
import {
  getTask,
  updateTask,
  deleteTask,
  type Task,
  type TaskStatus,
  TASK_STATUSES,
} from '@/lib/api/tasks';
import {
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
  User,
  FolderKanban,
  Users,
  GitMerge,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

const SELECT_CLASS =
  'flex h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50';

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  onConfirm,
  onCancel,
  submitting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Delete task?</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              This will permanently remove this task and all its dependencies.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Delete task
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Field ─────────────────────────────────────────────────────────────

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm text-slate-700 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

interface TaskDetailProps {
  taskId: string;
  trigger: React.ReactNode;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function TaskDetail({
  taskId,
  trigger,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailProps) {
  const [open, setOpen] = React.useState(false);
  const [task, setTask] = React.useState<Task | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [statusUpdating, setStatusUpdating] = React.useState(false);

  // Load task when panel opens
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchTask() {
      setLoading(true);
      setError(null);
      setTask(null);
      try {
        const t = await getTask(taskId);
        if (!cancelled) {
          setTask(t);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load task.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTask();
    return () => { cancelled = true; };
  }, [taskId, open]);

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!task) return;
    const newStatus = e.target.value as TaskStatus;
    setStatusUpdating(true);
    try {
      const updated = await updateTask(task.id, { status: newStatus });
      setTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      // revert shown value silently — task state stays as-is
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onTaskDeleted?.(task.id);
      setOpen(false);
      setConfirmDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTask(updated);
    onTaskUpdated?.(updated);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center space-y-2 mt-4">
              <p className="text-sm font-semibold text-red-700">Failed to load task</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {!loading && task && (
            <div className="space-y-5">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900 leading-snug flex-1">
                    {task.title}
                  </h2>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TaskForm
                      mode="edit"
                      task={task}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          id={`edit-task-${task.id}`}
                          aria-label="Edit task"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      }
                      onSubmit={(payload) => updateTask(task.id, payload)}
                      onSuccess={handleTaskUpdated}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-slate-700 hover:text-red-600 hover:border-red-200"
                      onClick={() => setConfirmDelete(true)}
                      id={`delete-task-${task.id}`}
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Inline status change */}
                <div className="flex items-center gap-3">
                  <select
                    value={task.status}
                    onChange={handleStatusChange}
                    disabled={statusUpdating}
                    aria-label="Task status"
                    className={cn(SELECT_CLASS, 'w-auto')}
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {statusUpdating && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </div>

              <Separator />

              {/* Description */}
              {task.description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                    Description
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}
              {!task.description && (
                <p className="text-xs text-slate-400 italic">No description provided.</p>
              )}

              <Separator />

              {/* Metadata fields */}
              <div className="space-y-4">
                <DetailField icon={FolderKanban} label="Project">
                  <span className="font-mono text-xs text-slate-500 break-all">{task.projectId}</span>
                </DetailField>

                <DetailField icon={User} label="Assignee">
                  {task.assigneeId ? (
                    <span className="font-mono text-xs text-slate-500 break-all">
                      {task.assigneeId}
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </DetailField>

                <DetailField icon={Users} label="Team">
                  {task.teamId ? (
                    <span className="font-mono text-xs text-slate-500 break-all">{task.teamId}</span>
                  ) : (
                    <span className="text-slate-400">No team</span>
                  )}
                </DetailField>

                <DetailField icon={CalendarDays} label="Due Date">
                  <span className={task.dueDate ? 'text-slate-700' : 'text-slate-400'}>
                    {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                  </span>
                </DetailField>

                <DetailField icon={CalendarDays} label="Start Date">
                  <span className={task.startDate ? 'text-slate-700' : 'text-slate-400'}>
                    {task.startDate ? formatDate(task.startDate) : 'No start date'}
                  </span>
                </DetailField>
              </div>

              <Separator />

              {/* Dependencies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Dependencies</p>
                </div>
                <TaskDependencies taskId={task.id} />
              </div>

              {/* Error from delete */}
              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation — rendered outside Sheet to avoid z-index issues */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          submitting={deleting}
        />
      )}
    </>
  );
}
