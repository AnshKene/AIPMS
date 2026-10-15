import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@/lib/api/projects';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline' | 'info' }
> = {
  PLANNING: { label: 'Planning', variant: 'info' },
  ACTIVE: { label: 'Active', variant: 'success' },
  ON_HOLD: { label: 'On Hold', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  ARCHIVED: { label: 'Archived', variant: 'outline' },
};

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
