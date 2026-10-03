'use client';

import * as React from 'react';
import { type Task } from '@/lib/api/tasks';
import { type Sprint } from '@/lib/api/sprints';
import { cn } from '@/lib/utils';
import { Activity, AlertCircle, Calendar, ArrowUpRight } from 'lucide-react';

export interface SprintHealthStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  todoTasks: number;
  blockedTasks: number;
  progressPercent: number;
  daysRemaining: number;
  totalDays: number;
  elapsedDays: number;
  timelinePercent: number;
  isOverdue: boolean;
}

export function computeSprintHealth(sprint: Sprint, tasks: Task[]): SprintHealthStats {
  const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
  const totalTasks = sprintTasks.length;

  const completedTasks = sprintTasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = sprintTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewTasks = sprintTasks.filter((t) => t.status === 'IN_REVIEW').length;
  const todoTasks = sprintTasks.filter((t) => t.status === 'TODO').length;
  const blockedTasks = sprintTasks.filter((t) => t.status === 'BLOCKED').length;

  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const now = new Date();
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  now.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0 && sprint.status === 'ACTIVE';

  const totalSprintDuration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsed = Math.max(0, Math.min(totalSprintDuration, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))));
  const timelinePercent = Math.round((elapsed / totalSprintDuration) * 100);

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    inReviewTasks,
    todoTasks,
    blockedTasks,
    progressPercent,
    daysRemaining,
    totalDays: totalSprintDuration,
    elapsedDays: elapsed,
    timelinePercent,
    isOverdue,
  };
}

export function SprintHealthSnapshot({
  sprint,
  tasks,
  compact = false,
  onFilterBlocked,
  className,
}: {
  sprint: Sprint;
  tasks: Task[];
  compact?: boolean;
  onFilterBlocked?: () => void;
  className?: string;
}) {
  const stats = React.useMemo(() => computeSprintHealth(sprint, tasks), [sprint, tasks]);

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">
            {stats.completedTasks} of {stats.totalTasks} tasks completed
          </span>
          <span className="font-semibold text-slate-900">{stats.progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              stats.progressPercent === 100
                ? 'bg-emerald-500'
                : stats.progressPercent > 50
                  ? 'bg-blue-600'
                  : 'bg-blue-500',
            )}
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4', className)}>
      {/* Header with Timeline info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-900">Sprint Health & Timeline</h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {sprint.status === 'ACTIVE' ? (
            stats.isOverdue ? (
              <span className="text-red-600 font-semibold">
                {Math.abs(stats.daysRemaining)} {Math.abs(stats.daysRemaining) === 1 ? 'day' : 'days'} overdue
              </span>
            ) : stats.daysRemaining === 0 ? (
              <span className="text-amber-600 font-semibold">Ends today</span>
            ) : (
              <span>
                <strong className="text-slate-900">{stats.daysRemaining}</strong> {stats.daysRemaining === 1 ? 'day' : 'days'} remaining of {stats.totalDays}d iteration
              </span>
            )
          ) : sprint.status === 'COMPLETED' ? (
            <span className="text-emerald-700 font-medium">Completed iteration</span>
          ) : (
            <span>
              {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Attention Strip if Blocked Tasks Exist */}
      {stats.blockedTasks > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-medium">
              <strong>{stats.blockedTasks}</strong> {stats.blockedTasks === 1 ? 'task is' : 'tasks are'} currently blocked and may require attention.
            </span>
          </div>
          {onFilterBlocked && (
            <button
              type="button"
              onClick={onFilterBlocked}
              className="inline-flex items-center gap-1 font-semibold text-red-700 hover:text-red-900 hover:underline shrink-0 cursor-pointer"
            >
              <span>View Blocked</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Progress Metric & Timeline Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.progressPercent}%</span>
            <span className="text-slate-500">
              ({stats.completedTasks} of {stats.totalTasks} tasks complete)
            </span>
          </div>

          {sprint.status === 'ACTIVE' && (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Timeline: <strong>{stats.elapsedDays}d</strong> elapsed ({stats.timelinePercent}%)
            </span>
          )}
        </div>

        {/* Multi-segment factual progress bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          {stats.totalTasks > 0 ? (
            <>
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
                title={`Done: ${stats.completedTasks}`}
              />
              <div
                className="bg-amber-400 transition-all duration-300"
                style={{ width: `${(stats.inReviewTasks / stats.totalTasks) * 100}%` }}
                title={`In Review: ${stats.inReviewTasks}`}
              />
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${(stats.inProgressTasks / stats.totalTasks) * 100}%` }}
                title={`In Progress: ${stats.inProgressTasks}`}
              />
              <div
                className="bg-red-400 transition-all duration-300"
                style={{ width: `${(stats.blockedTasks / stats.totalTasks) * 100}%` }}
                title={`Blocked: ${stats.blockedTasks}`}
              />
            </>
          ) : (
            <div className="h-full w-full bg-slate-100" />
          )}
        </div>
      </div>

      {/* Breakdown Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-center">
          <span className="block text-[11px] font-medium text-slate-500">Todo</span>
          <span className="text-sm font-bold text-slate-800">{stats.todoTasks}</span>
        </div>
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-2.5 text-center">
          <span className="block text-[11px] font-medium text-blue-700">In Progress</span>
          <span className="text-sm font-bold text-blue-800">{stats.inProgressTasks}</span>
        </div>
        <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-2.5 text-center">
          <span className="block text-[11px] font-medium text-amber-700">In Review</span>
          <span className="text-sm font-bold text-amber-800">{stats.inReviewTasks}</span>
        </div>
        <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5 text-center">
          <span className="block text-[11px] font-medium text-emerald-700">Done</span>
          <span className="text-sm font-bold text-emerald-800">{stats.completedTasks}</span>
        </div>
        <div className="rounded-lg bg-red-50/60 border border-red-100 p-2.5 text-center col-span-2 sm:col-span-1">
          <span className="block text-[11px] font-medium text-red-700">Blocked</span>
          <span className="text-sm font-bold text-red-800">{stats.blockedTasks}</span>
        </div>
      </div>
    </div>
  );
}
