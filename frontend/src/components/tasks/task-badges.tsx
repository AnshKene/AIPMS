'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { type TaskStatus, type TaskPriority } from '@/lib/api/tasks';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  TODO: {
    label: 'Todo',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DONE: {
    label: 'Done',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  BLOCKED: {
    label: 'Blocked',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.TODO;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; className: string; dot: string }
> = {
  LOW: {
    label: 'Low',
    className: 'text-slate-500',
    dot: 'bg-slate-300',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  HIGH: {
    label: 'High',
    className: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  URGENT: {
    label: 'Urgent',
    className: 'text-red-600',
    dot: 'bg-red-500',
  },
};

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
