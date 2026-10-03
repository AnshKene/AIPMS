'use client';

import * as React from 'react';
import { type Risk } from '@/lib/api/risks';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskCardProps {
  risk: Risk;
  onEdit?: (risk: Risk) => void;
  onDelete?: (risk: Risk) => void;
  onViewDetail?: (risk: Risk) => void;
}

export function RiskCard({
  risk,
  onEdit,
  onDelete,
  onViewDetail,
}: RiskCardProps) {
  const isCritical = risk.riskScore >= 6;

  return (
    <Card
      className={cn(
        'group transition-all hover:shadow-md border-slate-200 bg-white relative overflow-hidden',
        isCritical && 'border-rose-200 hover:border-rose-300',
      )}
    >
      {isCritical && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
      )}

      <CardContent className="p-5 space-y-4">
        {/* Header Badges & Title */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <RiskScoreBadge score={risk.riskScore} />
              <RiskStatusBadge status={risk.status} />
              <div className="flex items-center gap-1">
                <RiskProbabilityBadge probability={risk.probability} />
                <RiskImpactBadge impact={risk.impact} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(risk);
                  }}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                  title="Edit Risk"
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
                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  title="Delete Risk"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <h3
            onClick={() => onViewDetail?.(risk)}
            className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
          >
            {risk.title}
          </h3>

          {risk.description && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {risk.description}
            </p>
          )}
        </div>

        {/* Mitigation Plan Snippet */}
        {risk.mitigationPlan ? (
          <div className="rounded-md bg-slate-50 border border-slate-100 p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Mitigation Strategy</span>
            </div>
            <p className="text-slate-500 line-clamp-1 pl-5">
              {risk.mitigationPlan}
            </p>
          </div>
        ) : (
          <div className="rounded-md bg-amber-50/50 border border-amber-100 p-2 text-[11px] text-amber-700 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>No mitigation strategy defined yet</span>
          </div>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {risk.dueDate && (
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Date(risk.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {risk.ownerId && (
              <span className="flex items-center gap-1 text-slate-600 font-mono text-[11px]" title={`Owner: ${risk.ownerId}`}>
                <User className="h-3.5 w-3.5 text-slate-400" />
                {risk.ownerId.slice(0, 8)}...
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail?.(risk)}
            className="h-7 text-xs text-indigo-600 hover:text-indigo-800 gap-1 p-0 hover:bg-transparent font-medium"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
