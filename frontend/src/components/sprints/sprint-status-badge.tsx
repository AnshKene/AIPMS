'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { type SprintStatus } from '@/lib/api/sprints';
import { Play, CheckCircle2, Clock, Ban } from 'lucide-react';

const SPRINT_STATUS_CONFIG: Record<
  SprintStatus,
  {
    label: string;
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PLANNED: {
    label: 'Planned',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Clock,
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
    icon: Play,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Ban,
  },
};

export function SprintStatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: SprintStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const config = SPRINT_STATUS_CONFIG[status] ?? SPRINT_STATUS_CONFIG.PLANNED;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      {config.label}
    </span>
  );
}
