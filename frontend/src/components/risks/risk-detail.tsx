'use client';

import * as React from 'react';
import { type Risk, type RiskStatus, RISK_STATUSES } from '@/lib/api/risks';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  RiskStatusBadge,
  RiskScoreBadge,
  RiskProbabilityBadge,
  RiskImpactBadge,
} from './risk-status-badge';
import {
  Calendar,
  User,
  Clock,
  Edit2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

interface RiskDetailProps {
  risk: Risk | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (risk: Risk) => void;
  onDelete?: (risk: Risk) => void;
  onStatusChange?: (risk: Risk, newStatus: RiskStatus) => void;
}

export function RiskDetail({
  risk,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
}: RiskDetailProps) {
  if (!risk) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6">
        {/* Header Badges */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskScoreBadge score={risk.riskScore} />
            <RiskStatusBadge status={risk.status} />
          </div>

          <h2 className="text-xl font-bold text-slate-900 leading-snug">
            {risk.title}
          </h2>

          <div className="flex items-center gap-2">
            <RiskProbabilityBadge probability={risk.probability} />
            <RiskImpactBadge impact={risk.impact} />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Risk Description
          </span>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {risk.description || 'No description provided.'}
          </p>
        </div>

        {/* Mitigation Plan */}
        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Mitigation Strategy
          </span>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {risk.mitigationPlan || 'No mitigation plan documented yet.'}
          </div>
        </div>

        {/* Status Transition Quick Actions */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Update Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            {RISK_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange?.(risk, s)}
                className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                  risk.status === s
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Target Due Date</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {risk.dueDate ? (
                new Date(risk.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Risk Owner</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {risk.ownerId ? `${risk.ownerId.slice(0, 13)}...` : <span className="text-slate-400 font-sans">Unassigned</span>}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Created At</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {new Date(risk.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Last Updated</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {new Date(risk.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete?.(risk);
            }}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1.5 text-xs font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Risk
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onEdit?.(risk);
            }}
            className="gap-1.5 text-xs font-medium"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Risk
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
