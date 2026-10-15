'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { type Risk } from '@/lib/api/risks';
import { type Project } from '@/lib/api/projects';
import { AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';

interface PriorityRisksCardProps {
  risks?: Risk[];
  projects?: Project[];
}

export function PriorityRisksCard({ risks = [], projects = [] }: PriorityRisksCardProps) {
  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const displayRisks = React.useMemo(() => {
    if (!risks || risks.length === 0) return [];

    const openRisks = risks.filter((r) => r.status === 'OPEN' || r.status === 'MITIGATING');
    const sorted = [...openRisks].sort((a, b) => {
      const aScore =
        (a.riskScore ?? 0) ||
        (a.probability === 'HIGH' ? 3 : a.probability === 'MEDIUM' ? 2 : 1) *
          (a.impact === 'HIGH' ? 3 : a.impact === 'MEDIUM' ? 2 : 1);
      const bScore =
        (b.riskScore ?? 0) ||
        (b.probability === 'HIGH' ? 3 : b.probability === 'MEDIUM' ? 2 : 1) *
          (b.impact === 'HIGH' ? 3 : b.impact === 'MEDIUM' ? 2 : 1);
      return bScore - aScore;
    });

    return sorted.slice(0, 4).map((r) => {
      const isHigh = (r.riskScore ?? 0) >= 6 || r.probability === 'HIGH' || r.impact === 'HIGH';
      return {
        id: r.id,
        title: r.title,
        projectId: r.projectId,
        project: projectMap.get(r.projectId) || 'Workspace Risk',
        level: isHigh ? 'High' : 'Medium',
        score: r.riskScore ?? (isHigh ? 9 : 4),
        badgeBg: isHigh
          ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        iconBg: isHigh
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      };
    });
  }, [risks, projectMap]);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">High Priority Risks</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Items requiring active mitigation</p>
          </div>
        </div>
        <Link
          href="/risks"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 group transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="h-3.5 w-3.5 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Risks List */}
      <div className="mt-3 space-y-2.5">
        {displayRisks.length === 0 ? (
          <div className="py-7 flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200/70 dark:border-slate-800">
            <ShieldCheck className="h-7 w-7 text-emerald-500 mb-1.5" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Zero High-Priority Risks
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[200px]">
              All project risks are mitigated or well within normal tolerance.
            </p>
          </div>
        ) : (
          displayRisks.map((item) => (
            <Link
              key={item.id}
              href={`/risks?projectId=${item.projectId}`}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={`h-7 w-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 truncate">
                    <span className="truncate">{item.project}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Score: {item.score}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${item.badgeBg} shrink-0 shadow-2xs`}
              >
                {item.level}
              </span>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
