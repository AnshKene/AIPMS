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
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  DONE: {
    label: 'Done',
    className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  BLOCKED: {
    label: 'Blocked',
    className: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
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
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide shrink-0',
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
  { label: string; className: string; dot: string; pillClassName: string }
> = {
  LOW: {
    label: 'Low',
    className: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400 dark:bg-slate-500',
    pillClassName: 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500 dark:bg-blue-400',
    pillClassName: 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
  },
  HIGH: {
    label: 'High',
    className: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400',
    pillClassName: 'bg-amber-50/90 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
  },
  URGENT: {
    label: 'Urgent',
    className: 'text-rose-600 dark:text-rose-400 font-bold',
    dot: 'bg-rose-500 animate-pulse',
    pillClassName: 'bg-rose-50/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60 font-semibold',
  },
};

export function TaskPriorityBadge({
  priority,
  className,
  variant = 'pill',
}: {
  priority: TaskPriority;
  className?: string;
  variant?: 'pill' | 'text';
}) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  
  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide shrink-0',
          config.pillClassName,
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium shrink-0',
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
