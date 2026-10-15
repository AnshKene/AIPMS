import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgStyle?: string;
  iconTextStyle?: string;
  badge?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function AdminMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgStyle = 'bg-blue-50 dark:bg-blue-950/60',
  iconTextStyle = 'text-blue-600 dark:text-blue-400',
  badge,
  isLoading = false,
  className,
}: AdminMetricCardProps) {
  return (
    <Card
      className={cn(
        'p-5 space-y-3 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={cn('p-2 rounded-xl shrink-0', iconBgStyle, iconTextStyle)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-1 py-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {value}
            </div>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
