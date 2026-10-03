'use client';

import * as React from 'react';
import {
  type Risk,
  type RiskProbability,
  type RiskImpact,
  type RiskStatus,
  type CreateRiskPayload,
  type UpdateRiskPayload,
  calculateRiskScore,
  formatRiskError,
  RISK_PROBABILITIES,
  RISK_IMPACTS,
  RISK_STATUSES,
} from '@/lib/api/risks';
import { type Project } from '@/lib/api/projects';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiskScoreBadge } from './risk-status-badge';
import { Loader2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface RiskFormProps {
  mode: 'create' | 'edit';
  risk?: Risk | null;
  projects?: Project[];
  defaultProjectId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (payload: CreateRiskPayload | UpdateRiskPayload) => Promise<Risk>;
  onSuccess?: (risk: Risk) => void;
}

export function RiskForm({
  mode,
  risk,
  projects = [],
  defaultProjectId,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSubmit,
  onSuccess,
}: RiskFormProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  function handleOpenChange(val: boolean) {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  }

  return (
    <>
      {trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block">
          {trigger}
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6">
          {isOpen && (
            <RiskFormContent
              key={mode === 'edit' ? (risk?.id ?? 'edit') : `new-${defaultProjectId ?? 'def'}`}
              mode={mode}
              risk={risk}
              projects={projects}
              defaultProjectId={defaultProjectId}
              onSubmit={onSubmit}
              onSuccess={(saved) => {
                onSuccess?.(saved);
                handleOpenChange(false);
              }}
              onCancel={() => handleOpenChange(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

interface RiskFormContentProps {
  mode: 'create' | 'edit';
  risk?: Risk | null;
  projects: Project[];
  defaultProjectId?: string;
  onSubmit: (payload: CreateRiskPayload | UpdateRiskPayload) => Promise<Risk>;
  onSuccess: (risk: Risk) => void;
  onCancel: () => void;
}

function RiskFormContent({
  mode,
  risk,
  projects,
  defaultProjectId,
  onSubmit,
  onSuccess,
  onCancel,
}: RiskFormContentProps) {
  const [projectId, setProjectId] = React.useState(
    mode === 'edit'
      ? (risk?.projectId ?? '')
      : (defaultProjectId || (projects[0]?.id ?? '')),
  );
  const [title, setTitle] = React.useState(mode === 'edit' ? (risk?.title ?? '') : '');
  const [description, setDescription] = React.useState(
    mode === 'edit' ? (risk?.description ?? '') : '',
  );
  const [probability, setProbability] = React.useState<RiskProbability>(
    mode === 'edit' ? (risk?.probability ?? 'MEDIUM') : 'MEDIUM',
  );
  const [impact, setImpact] = React.useState<RiskImpact>(
    mode === 'edit' ? (risk?.impact ?? 'HIGH') : 'HIGH',
  );
  const [status, setStatus] = React.useState<RiskStatus>(
    mode === 'edit' ? (risk?.status ?? 'OPEN') : 'OPEN',
  );
  const [mitigationPlan, setMitigationPlan] = React.useState(
    mode === 'edit' ? (risk?.mitigationPlan ?? '') : '',
  );
  const [ownerId, setOwnerId] = React.useState(
    mode === 'edit' ? (risk?.ownerId ?? '') : '',
  );
  const [dueDate, setDueDate] = React.useState(
    mode === 'edit' && risk?.dueDate ? risk.dueDate.slice(0, 10) : '',
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const liveScore = calculateRiskScore(probability, impact);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (mode === 'create' && !projectId) {
      setError('Please select a project.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let result: Risk;
      if (mode === 'create') {
        const payload: CreateRiskPayload = {
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          probability,
          impact,
          status,
          mitigationPlan: mitigationPlan.trim() || undefined,
          ownerId: ownerId.trim() || undefined,
          dueDate: dueDate || undefined,
        };
        result = await onSubmit(payload);
      } else {
        const payload: UpdateRiskPayload = {
          title: title.trim(),
          description: description.trim() || null,
          probability,
          impact,
          status,
          mitigationPlan: mitigationPlan.trim() || null,
          ownerId: ownerId.trim() || null,
          dueDate: dueDate || null,
        };
        result = await onSubmit(payload);
      }

      onSuccess(result);
    } catch (err) {
      setError(formatRiskError(err, 'Failed to save risk.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          {mode === 'create' ? 'Log New Project Risk' : 'Edit Project Risk'}
        </h2>
        <p className="text-xs text-slate-500">
          {mode === 'create'
            ? 'Assess likelihood, severity impact, mitigation roadmap, and assign ownership.'
            : 'Update risk probability, impact metrics, status, or mitigation strategy.'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selection (Create only) */}
        {mode === 'create' && projects.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Project <span className="text-rose-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="" disabled>
                Select target project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">
            Risk Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Third-Party Payment Gateway Outage"
            maxLength={255}
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Detail root cause, trigger conditions, and business implications..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Probability & Impact Grid with Live Score Calculator */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Risk Matrix Evaluation
            </span>
            <RiskScoreBadge score={liveScore} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Probability</label>
              <select
                value={probability}
                onChange={(e) => setProbability(e.target.value as RiskProbability)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RISK_PROBABILITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} (Score {p === 'HIGH' ? '3' : p === 'MEDIUM' ? '2' : '1'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Impact</label>
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value as RiskImpact)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RISK_IMPACTS.map((i) => (
                  <option key={i} value={i}>
                    {i} (Score {i === 'HIGH' ? '3' : i === 'MEDIUM' ? '2' : '1'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status & Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RiskStatus)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RISK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Target Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Mitigation Strategy */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Mitigation Strategy</label>
          <textarea
            value={mitigationPlan}
            onChange={(e) => setMitigationPlan(e.target.value)}
            rows={3}
            placeholder="Actionable plan to reduce probability or mitigate negative consequences..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Owner ID */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Owner User UUID</label>
          <Input
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder="e.g., 22222222-2222-2222-2222-222222222222"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Risk' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
