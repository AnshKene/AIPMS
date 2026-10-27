import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { CalendarDays, ArrowUpRight, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { formatProjectName } from '@/lib/utils';
import type { Project } from '@/lib/api/projects';
import type { Task } from '@/lib/api/tasks';
import type { Risk } from '@/lib/api/risks';
import { userDirectory } from '@/lib/auth/user-directory';

interface ProjectCardProps {
  project: Project;
  tasks?: Task[];
  taskSummary?: Task[];
  risks?: Risk[];
  riskCount?: number;
  currentUserId?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectCard({
  project,
  tasks = [],
  taskSummary,
  risks = [],
  riskCount,
  currentUserId,
}: ProjectCardProps) {
  const isArchived = project.status === 'ARCHIVED';
  const isCurrentUserOwner = Boolean(currentUserId && project.ownerId === currentUserId);

  // Compute tasks for this project
  const projectTasks = React.useMemo(() => {
    if (taskSummary) return taskSummary;
    return tasks.filter((t) => t.projectId === project.id);
  }, [taskSummary, tasks, project.id]);

  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter((t) => t.status === 'DONE').length;
  const progress =
    project.status === 'COMPLETED'
      ? 100
      : totalTasks > 0
      ? Math.round((doneTasks / totalTasks) * 100)
      : 0;

  // Compute open risks for this project
  const projectRisks = React.useMemo(() => {
    return risks.filter(
      (r) => r.projectId === project.id && (r.status === 'OPEN' || r.status === 'MITIGATING'),
    );
  }, [risks, project.id]);

  const openRiskCount = riskCount !== undefined ? riskCount : projectRisks.length;
  const hasHighRisk = projectRisks.some((r) => r.probability === 'HIGH' || r.impact === 'HIGH');

  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card
        className={[
          'transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800',
          isArchived ? 'opacity-60' : '',
        ].join(' ')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#0052FF] dark:group-hover:text-[#4D7CFF] transition-colors">
                {formatProjectName(project.name)}
              </CardTitle>
              {project.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ProjectStatusBadge status={project.status} />
              <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#0052FF] dark:group-hover:text-[#4D7CFF] transition-colors" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {totalTasks > 0 ? `${doneTasks}/${totalTasks} tasks complete` : 'No task data'}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  hasHighRisk ? 'bg-rose-500' : 'bg-emerald-500'
                } transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">
                  {isCurrentUserOwner ? (
                    <span className="font-semibold text-blue-600 dark:text-blue-400">You (Owner)</span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                      Owner: {project.ownerId ? userDirectory.getUser(project.ownerId).name : 'Unassigned'}
                    </span>
                  )}
                </span>
              </div>

              {openRiskCount > 0 && (
                <span className="flex items-center gap-1 font-semibold text-rose-500 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {openRiskCount} risk{openRiskCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatDate(project.startDate)}
                  {(project.startDate || project.endDate) && ' → '}
                  {formatDate(project.endDate)}
                </span>
              </div>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(project.id);
                }}
                title="Click to copy Project UUID"
                className="font-mono text-[10px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded transition-colors"
              >
                ID: {project.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

