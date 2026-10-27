import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Crown, UserCheck, Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RoleType =
  // Global Roles
  | 'ADMIN'
  | 'PROJECT_OWNER'
  | 'PROJECT_MANAGER'
  | 'TEAM_MEMBER'
  | 'VIEWER'
  // Project / Team specific
  | 'MEMBER'
  | 'TEAM_LEAD';

interface RoleBadgeProps {
  role: RoleType | string;
  scope?: 'global' | 'project' | 'team';
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

interface RoleConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  ADMIN: {
    label: 'Admin',
    className: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/80',
    icon: ShieldCheck,
    description: 'Designated System Administrator with global platform authority.',
  },
  PROJECT_OWNER: {
    label: 'Owner',
    className: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80',
    icon: Crown,
    description: 'Project Owner with full project ownership and governance authority.',
  },
  PROJECT_MANAGER: {
    label: 'Project Manager',
    className: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/80',
    icon: Shield,
    description: 'Manages project execution, tasks, sprints, and team workflows.',
  },
  TEAM_LEAD: {
    label: 'Team Lead',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80',
    icon: Users,
    description: 'Coordinates team assignments and reviews work within the team.',
  },
  TEAM_MEMBER: {
    label: 'Member',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80',
    icon: UserCheck,
    description: 'Standard contributor participating in tasks and team work.',
  },
  MEMBER: {
    label: 'Member',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80',
    icon: UserCheck,
    description: 'Project contributor with assignment and execution rights.',
  },
  VIEWER: {
    label: 'Viewer',
    className: 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: Eye,
    description: 'Read-only access to projects, tasks, and analytics.',
  },
};

export function RoleBadge({
  role,
  scope,
  size = 'sm',
  className,
  showIcon = true,
}: RoleBadgeProps) {
  const normalizedKey = (role || 'VIEWER').toUpperCase();
  const config = ROLE_CONFIGS[normalizedKey] || {
    label: role,
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    icon: UserCheck,
    description: role,
  };

  const Icon = config.icon;

  // Custom label overrides based on scope
  let displayLabel = config.label;
  if (scope === 'project' && normalizedKey === 'PROJECT_MANAGER') {
    displayLabel = 'Project Manager';
  } else if (scope === 'project' && normalizedKey === 'MEMBER') {
    displayLabel = 'Member';
  } else if (scope === 'project' && normalizedKey === 'VIEWER') {
    displayLabel = 'Viewer';
  }

  return (
    <Badge
      variant="outline"
      title={config.description}
      className={cn(
        'font-medium inline-flex items-center gap-1 select-none transition-colors border',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />}
      <span>{displayLabel}</span>
    </Badge>
  );
}
