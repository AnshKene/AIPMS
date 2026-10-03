'use client';

import * as React from 'react';
import { type Sprint } from '@/lib/api/sprints';
import { type Task } from '@/lib/api/tasks';
import { SprintStatusBadge } from './sprint-status-badge';
import { SprintHealthSnapshot, computeSprintHealth } from './sprint-health';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Ban,
  ArrowRight,
  Target,
} from 'lucide-react';

// ─── Active Sprint Hero Card ──────────────────────────────────────────────────

interface ActiveSprintCardProps {
  sprint: Sprint;
  tasks: Task[];
  projectName?: string;
  onOpenWorkspace: (sprint: Sprint) => void;
  onComplete: (sprint: Sprint) => void;
  onCancel: (sprint: Sprint) => void;
  onEdit: (sprint: Sprint) => void;
}

export function ActiveSprintCard({
  sprint,
  tasks,
  projectName,
  onOpenWorkspace,
  onComplete,
  onCancel,
  onEdit,
}: ActiveSprintCardProps) {
  const stats = React.useMemo(() => computeSprintHealth(sprint, tasks), [sprint, tasks]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-white via-blue-50/20 to-slate-50 p-6 shadow-sm transition-all hover:shadow-md">
      {/* Decorative subtle accent */}
      <div className="absolute top-0 right-0 h-32 w-32 bg-blue-400/10 rounded-bl-full pointer-events-none" />

      <div className="space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Active Iteration
              </span>
              <SprintStatusBadge status="ACTIVE" />
              {projectName && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {projectName}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
              {sprint.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(sprint)}
              className="text-xs gap-1.5 h-8 bg-white/80 hover:bg-white"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(sprint)}
              className="text-xs gap-1.5 h-8 text-slate-600 hover:text-red-600 bg-white/80 hover:bg-red-50 hover:border-red-200"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onComplete(sprint)}
              className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete Sprint
            </Button>
          </div>
        </div>

        {/* Sprint Goal (if present) */}
        {sprint.goal && (
          <div className="flex items-start gap-2.5 rounded-lg bg-white/80 border border-slate-200/80 p-3 text-xs text-slate-700">
            <Target className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-slate-900">Sprint Goal: </strong>
              <span>{sprint.goal}</span>
            </div>
          </div>
        )}

        {/* Sprint Health Breakdown Snapshot */}
        <SprintHealthSnapshot sprint={sprint} tasks={tasks} />

        {/* Footer with Workspace CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>
                <strong className="text-slate-900">{stats.totalTasks}</strong> total tasks
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onOpenWorkspace(sprint)}
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
          >
            <span>Open Sprint Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Regular Sprint Card (Planned / Completed / Cancelled) ─────────────────────

interface SprintCardProps {
  sprint: Sprint;
  tasks: Task[];
  projectName?: string;
  onOpenWorkspace: (sprint: Sprint) => void;
  onStart?: (sprint: Sprint) => void;
  onEdit?: (sprint: Sprint) => void;
  onDelete?: (sprint: Sprint) => void;
}

export function SprintCard({
  sprint,
  tasks,
  projectName,
  onOpenWorkspace,
  onStart,
  onEdit,
  onDelete,
}: SprintCardProps) {
  const stats = React.useMemo(() => computeSprintHealth(sprint, tasks), [sprint, tasks]);

  return (
    <Card className="rounded-xl border border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-xs">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SprintStatusBadge status={sprint.status} />
              {projectName && (
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                  {projectName}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate" title={sprint.name}>
              {sprint.name}
            </h3>
          </div>

          {/* Contextual Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {sprint.status === 'PLANNED' && (
              <>
                {onStart && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStart(sprint)}
                    className="h-7 px-2.5 text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(sprint)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                    aria-label="Edit sprint"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(sprint)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Delete planned sprint"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}

            {(sprint.status === 'COMPLETED' || sprint.status === 'CANCELLED') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenWorkspace(sprint)}
                className="h-7 px-2.5 text-xs text-slate-600"
              >
                View Summary
              </Button>
            )}
          </div>
        </div>

        {/* Goal snippet */}
        {sprint.goal && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {sprint.goal}
          </p>
        )}

        {/* Compact Progress */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {stats.completedTasks} of {stats.totalTasks} tasks done
            </span>
            <span className="font-semibold text-slate-700">{stats.progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                sprint.status === 'COMPLETED'
                  ? 'bg-emerald-500'
                  : stats.progressPercent > 0
                    ? 'bg-blue-500'
                    : 'bg-slate-300'
              }`}
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dates & Footer CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenWorkspace(sprint)}
            className="font-semibold text-blue-600 hover:text-blue-800 text-xs cursor-pointer focus:outline-none focus:underline"
          >
            Tasks ({stats.totalTasks}) &rarr;
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
