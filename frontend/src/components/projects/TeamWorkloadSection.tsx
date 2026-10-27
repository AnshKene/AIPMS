'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/common/RoleBadge';
import { userDirectory } from '@/lib/auth/user-directory';
import type { Task, TaskStatus } from '@/lib/api/tasks';
import type { ProjectMember } from '@/lib/api/projects';
import {
  BarChart3,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamWorkloadSectionProps {
  tasks: Task[];
  members: ProjectMember[];
  ownerId?: string;
  className?: string;
}

interface MemberWorkload {
  userId: string;
  name: string;
  email: string;
  role?: string;
  isOwner?: boolean;
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  completedPercent: number;
}

export function TeamWorkloadSection({
  tasks,
  members,
  ownerId,
  className,
}: TeamWorkloadSectionProps) {
  const directoryVersion = React.useSyncExternalStore(
    (cb) => userDirectory.subscribe(cb),
    () => userDirectory.getVersion(),
    () => 0,
  );

  // Aggregate tasks by assignee
  const { memberWorkloads, unassignedTasks, totalOverdue } = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const taskMap = new Map<string, Task[]>();
    const unassigned: Task[] = [];
    let overdueCount = 0;

    tasks.forEach((t) => {
      // Check overdue
      if (t.dueDate && t.status !== 'DONE') {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < now) {
          overdueCount++;
        }
      }

      if (!t.assigneeId) {
        unassigned.push(t);
      } else {
        const existing = taskMap.get(t.assigneeId) || [];
        existing.push(t);
        taskMap.set(t.assigneeId, existing);
      }
    });

    // Collect all relevant user IDs: members + owner + any assignees
    const allUserIds = new Set<string>();
    if (ownerId) allUserIds.add(ownerId);
    members.forEach((m) => allUserIds.add(m.userId));
    taskMap.forEach((_, userId) => allUserIds.add(userId));

    const workloads: MemberWorkload[] = [];

    allUserIds.forEach((userId) => {
      const userTasks = taskMap.get(userId) || [];
      const profile = userDirectory.getUser(userId);

      const byStatus: Record<TaskStatus, number> = {
        TODO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 0,
        BLOCKED: 0,
      };

      let memberOverdue = 0;

      userTasks.forEach((t) => {
        if (byStatus[t.status] !== undefined) {
          byStatus[t.status]++;
        }
        if (t.dueDate && t.status !== 'DONE') {
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < now) {
            memberOverdue++;
          }
        }
      });

      const memberRole = members.find((m) => m.userId === userId)?.role;
      const isOwner = userId === ownerId;

      const total = userTasks.length;
      const completed = byStatus.DONE;
      const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      workloads.push({
        userId,
        name: profile.name,
        email: profile.email,
        role: isOwner ? 'PROJECT_OWNER' : memberRole,
        isOwner,
        totalTasks: total,
        byStatus,
        overdueTasks: memberOverdue,
        completedPercent,
      });
    });

    // Sort: owners and members with tasks first, then others
    workloads.sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      return b.totalTasks - a.totalTasks;
    });

    return {
      memberWorkloads: workloads,
      unassignedTasks: unassigned,
      totalOverdue: overdueCount,
    };
  }, [tasks, members, ownerId, directoryVersion]);

  return (
    <Card className={cn('rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Team Workload & Task Distribution
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-time work assignment distribution across team contributors.
            </p>
          </div>
        </div>

        {/* Overview Stats Badges */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-slate-700">
            {tasks.length} total tasks
          </Badge>
          {totalOverdue > 0 && (
            <Badge variant="outline" className="text-[10px] font-semibold border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
              {totalOverdue} overdue
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Unassigned Work Alert if applicable */}
        {unassignedTasks.length > 0 && (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserX className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {unassignedTasks.length} {unassignedTasks.length === 1 ? 'task has' : 'tasks have'} no assigned owner
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Tasks awaiting assignment may delay sprint delivery.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 shrink-0 text-[10px]">
              Needs Assignee
            </Badge>
          </div>
        )}

        {/* Member Workload Rows */}
        {memberWorkloads.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No team members or tasks recorded for this project yet.
          </div>
        ) : (
          <div className="space-y-3">
            {memberWorkloads.map((mw) => {
              const hasTasks = mw.totalTasks > 0;
              const initials = userDirectory.getInitials(mw.name || mw.email);

              // Proportional distribution widths
              const activeCount = mw.byStatus.IN_PROGRESS + mw.byStatus.IN_REVIEW;
              const activePct = hasTasks ? (activeCount / mw.totalTasks) * 100 : 0;
              const todoPct = hasTasks ? (mw.byStatus.TODO / mw.totalTasks) * 100 : 0;
              const donePct = hasTasks ? (mw.byStatus.DONE / mw.totalTasks) * 100 : 0;
              const blockedPct = hasTasks ? (mw.byStatus.BLOCKED / mw.totalTasks) * 100 : 0;

              return (
                <div
                  key={mw.userId}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 space-y-2.5 text-xs"
                >
                  {/* Member Identity & Role */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        fallback={initials}
                        size="sm"
                        className="h-7 w-7 text-[10px] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {mw.name}
                          </span>
                          {mw.role && (
                            <RoleBadge role={mw.role} size="sm" scope="project" showIcon={false} className="py-0 px-1 text-[9px]" />
                          )}
                        </div>
                        {mw.email && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {mw.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Count & Overdue Summary */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasTasks ? (
                        <>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {mw.totalTasks} {mw.totalTasks === 1 ? 'task' : 'tasks'}
                          </span>
                          {mw.overdueTasks > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                              {mw.overdueTasks} overdue
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {mw.completedPercent}% done
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          No tasks assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Distribution Bar & Status Pills */}
                  {hasTasks ? (
                    <div className="space-y-1.5 pt-0.5">
                      {/* Segmented Distribution Bar */}
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                        {donePct > 0 && (
                          <div
                            style={{ width: `${donePct}%` }}
                            className="bg-emerald-500 transition-all"
                            title={`Done: ${mw.byStatus.DONE}`}
                          />
                        )}
                        {activePct > 0 && (
                          <div
                            style={{ width: `${activePct}%` }}
                            className="bg-blue-500 transition-all"
                            title={`In Progress / Review: ${activeCount}`}
                          />
                        )}
                        {todoPct > 0 && (
                          <div
                            style={{ width: `${todoPct}%` }}
                            className="bg-amber-400 transition-all"
                            title={`Todo: ${mw.byStatus.TODO}`}
                          />
                        )}
                        {blockedPct > 0 && (
                          <div
                            style={{ width: `${blockedPct}%` }}
                            className="bg-rose-500 transition-all"
                            title={`Blocked: ${mw.byStatus.BLOCKED}`}
                          />
                        )}
                      </div>

                      {/* Status Counts Breakdown */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                        {mw.byStatus.DONE > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {mw.byStatus.DONE} done
                          </span>
                        )}
                        {activeCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {activeCount} active
                          </span>
                        )}
                        {mw.byStatus.TODO > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            {mw.byStatus.TODO} todo
                          </span>
                        )}
                        {mw.byStatus.BLOCKED > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {mw.byStatus.BLOCKED} blocked
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
