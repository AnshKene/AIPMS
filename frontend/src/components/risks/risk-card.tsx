'use client';

import * as React from 'react';
import Link from 'next/link';
import { type Risk } from '@/lib/api/risks';
import { type Project } from '@/lib/api/projects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RiskStatusBadge,
  RiskScoreBadge,
  RiskProbabilityBadge,
  RiskImpactBadge,
} from './risk-status-badge';
import {
  ShieldAlert,
  Calendar,
  User,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldCheck,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskCardProps {
  risk: Risk;
  project?: Project;
  canManage?: boolean;
  onEdit?: (risk: Risk) => void;
  onDelete?: (risk: Risk) => void;
  onViewDetail?: (risk: Risk) => void;
}

export function RiskCard({
  risk,
  project,
  canManage = true,
  onEdit,
  onDelete,
  onViewDetail,
}: RiskCardProps) {
  const isCritical = risk.riskScore >= 6;

  return (
    <Card
      className={cn(
        'group transition-all hover:shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden flex flex-col justify-between',
        isCritical && 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-800',
      )}
    >
      {isCritical && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
      )}

      <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Top Row: Badges & RBAC Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <RiskScoreBadge score={risk.riskScore} />
              <RiskStatusBadge status={risk.status} />
            </div>

            {/* Quick Actions (Admin/PM only) */}
            {canManage && (onEdit || onDelete) && (
              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(risk);
                    }}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    title="Edit Risk"
                    aria-label={`Edit risk ${risk.title}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(risk);
                    }}
                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete Risk"
                    aria-label={`Delete risk ${risk.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Title & Project Link */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3
                onClick={() => onViewDetail?.(risk)}
                className="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors cursor-pointer line-clamp-1"
              >
                {risk.title}
              </h3>
            </div>

            {project && (
              <Link
                href={`/projects/${project.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
              >
                <FolderKanban className="h-3 w-3" />
                <span>{project.name}</span>
              </Link>
            )}
          </div>

          {/* Probability & Impact Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <RiskProbabilityBadge probability={risk.probability} />
            <RiskImpactBadge impact={risk.impact} />
          </div>

          {/* Description */}
          {risk.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {risk.description}
            </p>
          )}

          {/* Mitigation Plan Snippet */}
          {risk.mitigationPlan ? (
            <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Mitigation Strategy</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 line-clamp-1 pl-5">
                {risk.mitigationPlan}
              </p>
            </div>
          ) : (
            <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>No mitigation strategy documented</span>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            {risk.dueDate && (
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Date(risk.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {risk.ownerId && (
              <span
                className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]"
                title={`Owner: ${risk.ownerId}`}
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                {risk.ownerId.slice(0, 8)}...
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail?.(risk)}
            className="h-7 text-xs text-primary hover:text-primary-dark gap-1 p-0 hover:bg-transparent font-medium"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
