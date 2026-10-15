'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { type Task } from '@/lib/api/tasks';
import { type Project } from '@/lib/api/projects';
import { type Risk } from '@/lib/api/risks';
import { type Sprint } from '@/lib/api/sprints';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface RecentActivityCardProps {
  tasks?: Task[];
  projects?: Project[];
  risks?: Risk[];
  sprints?: Sprint[];
}

interface ActivityItem {
  id: string;
  title: string;
  projectName: string;
  timestamp: string;
  timestampMs: number;
  relativeTime: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  href: string;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentActivityCard({
  tasks = [],
  projects = [],
  risks = [],
  sprints = [],
}: RecentActivityCardProps) {
  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const activities = React.useMemo(() => {
    const items: ActivityItem[] = [];

    // 1. Tasks
    tasks.forEach((t) => {
      const rawDate = t.updatedAt || t.createdAt;
      const timeMs = rawDate ? new Date(rawDate).getTime() : 0;
      if (!timeMs || isNaN(timeMs)) return;

      const projectName = projectMap.get(t.projectId) || 'Workspace Project';
      const isDone = t.status === 'DONE';
      const isBlocked = t.status === 'BLOCKED';

      items.push({
        id: `task-${t.id}`,
        title: isDone
          ? `Completed "${t.title}"`
          : isBlocked
          ? `Blocked "${t.title}"`
          : `Updated "${t.title}"`,
        projectName,
        timestamp: rawDate,
        timestampMs: timeMs,
        relativeTime: formatRelativeTime(rawDate),
        icon: isDone ? CheckCircle2 : isBlocked ? AlertTriangle : Clock,
        iconBg: isDone
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : isBlocked
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
        href: `/tasks?projectId=${t.projectId}`,
      });
    });

    // 2. Risks
    risks.forEach((r) => {
      const rawDate = r.updatedAt || r.createdAt;
      const timeMs = rawDate ? new Date(rawDate).getTime() : 0;
      if (!timeMs || isNaN(timeMs)) return;

      const projectName = projectMap.get(r.projectId) || 'Workspace Project';
      items.push({
        id: `risk-${r.id}`,
        title: `Risk evaluated: "${r.title}"`,
        projectName,
        timestamp: rawDate,
        timestampMs: timeMs,
        relativeTime: formatRelativeTime(rawDate),
        icon: AlertTriangle,
        iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
        href: `/risks?projectId=${r.projectId}`,
      });
    });

    // 3. Sprints
    sprints.forEach((s) => {
      const rawDate = s.updatedAt || s.createdAt || s.startDate;
      const timeMs = rawDate ? new Date(rawDate).getTime() : 0;
      if (!timeMs || isNaN(timeMs)) return;

      const projectName = projectMap.get(s.projectId) || 'Workspace Project';
      items.push({
        id: `sprint-${s.id}`,
        title: `Sprint ${s.status.toLowerCase()}: "${s.name}"`,
        projectName,
        timestamp: rawDate,
        timestampMs: timeMs,
        relativeTime: formatRelativeTime(rawDate),
        icon: Zap,
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
        href: `/sprints?projectId=${s.projectId}`,
      });
    });

    // Sort descending by most recent
    items.sort((a, b) => b.timestampMs - a.timestampMs);

    return items.slice(0, 4);
  }, [tasks, risks, sprints, projectMap]);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Activity</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Live operational event stream</p>
          </div>
        </div>
        <Link
          href="/reports"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Activity Timeline List */}
      <div className="mt-3 space-y-2.5">
        {activities.length === 0 ? (
          <div className="py-7 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200/70 dark:border-slate-800">
            <Activity className="h-7 w-7 text-slate-400 mb-1.5" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Recent Events
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Activity log will stream live updates as tasks and sprints progress.
            </p>
          </div>
        ) : (
          activities.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`h-7 w-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {item.projectName}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                  {item.relativeTime}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
