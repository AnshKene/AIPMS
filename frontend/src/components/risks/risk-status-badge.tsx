'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { type RiskStatus, type RiskProbability, type RiskImpact } from '@/lib/api/risks';
import { AlertCircle, ShieldAlert, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<
  RiskStatus,
  {
    label: string;
    className: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  OPEN: {
    label: 'Open',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: AlertCircle,
  },
  MITIGATING: {
    label: 'Mitigating',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    icon: ShieldAlert,
  },
  RESOLVED: {
    label: 'Resolved',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  ACCEPTED: {
    label: 'Accepted',
    className:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: ShieldCheck,
  },
  CLOSED: {
    label: 'Closed',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: XCircle,
  },
};

export function RiskStatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: RiskStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
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

export function RiskScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  let colorStyles =
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let label = 'Low';

  if (score >= 6) {
    colorStyles =
      'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    label = 'Critical';
  } else if (score >= 3) {
    colorStyles =
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    label = 'Medium';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
        colorStyles,
        className,
      )}
    >
      <span className="font-mono font-bold">Score {score}</span>
      <span className="opacity-80 font-sans">({label})</span>
    </span>
  );
}

export function RiskProbabilityBadge({
  probability,
  className,
}: {
  probability: RiskProbability;
  className?: string;
}) {
  const styles: Record<RiskProbability, string> = {
    LOW: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium',
        styles[probability] ?? styles.LOW,
        className,
      )}
    >
      Prob: {probability}
    </span>
  );
}

export function RiskImpactBadge({
  impact,
  className,
}: {
  impact: RiskImpact;
  className?: string;
}) {
  const styles: Record<RiskImpact, string> = {
    LOW: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    HIGH: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium',
        styles[impact] ?? styles.LOW,
        className,
      )}
    >
      Impact: {impact}
    </span>
  );
}
