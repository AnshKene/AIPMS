import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, User, FolderKanban, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'TEAM_MEMBER'
  | 'VIEWER'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'SUCCESS'
  | 'FAILURE';

interface AdminStatusBadgeProps {
  status: StatusType | string;
  className?: string;
  showIcon?: boolean;
}

export function AdminStatusBadge({ status, className, showIcon = true }: AdminStatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'ADMIN':
      return (
        <Badge
          className={cn(
            'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
          ADMIN
        </Badge>
      );
    case 'PROJECT_MANAGER':
      return (
        <Badge
          className={cn(
            'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <FolderKanban className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
          PROJECT MANAGER
        </Badge>
      );
    case 'TEAM_MEMBER':
      return (
        <Badge
          className={cn(
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
          TEAM MEMBER
        </Badge>
      );
    case 'VIEWER':
      return (
        <Badge
          className={cn(
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <Shield className="h-3 w-3 text-slate-500" />}
          VIEWER
        </Badge>
      );
    case 'HEALTHY':
    case 'SUCCESS':
      return (
        <Badge
          className={cn(
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
          {normalized}
        </Badge>
      );
    case 'DEGRADED':
      return (
        <Badge
          className={cn(
            'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
          DEGRADED
        </Badge>
      );
    case 'OFFLINE':
    case 'FAILURE':
      return (
        <Badge
          className={cn(
            'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800 font-semibold gap-1 text-[10px]',
            className,
          )}
        >
          {showIcon && <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />}
          {normalized}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={cn('text-[10px]', className)}>
          {status}
        </Badge>
      );
  }
}
