import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import type { Project } from '@/lib/api/projects';

interface ProjectCardProps {
  project: Project;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isArchived = project.status === 'ARCHIVED';

  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card
        className={[
          'transition-all duration-200 hover:shadow-md hover:border-slate-300',
          isArchived ? 'opacity-60' : '',
        ].join(' ')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                {project.name}
              </CardTitle>
              {project.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ProjectStatusBadge status={project.status} />
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(project.startDate)}
              {(project.startDate || project.endDate) && ' → '}
              {formatDate(project.endDate)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
