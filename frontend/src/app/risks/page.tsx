'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import {
  listRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  type Risk,
  type RiskProbability,
  type RiskImpact,
  type RiskStatus,
  type CreateRiskPayload,
  type UpdateRiskPayload,
  formatRiskError,
  RISK_STATUSES,
} from '@/lib/api/risks';
import { listProjects, type Project } from '@/lib/api/projects';
import { RiskCard } from '@/components/risks/risk-card';
import { RiskForm } from '@/components/risks/risk-form';
import { RiskDetail } from '@/components/risks/risk-detail';
import { RiskMatrix } from '@/components/risks/risk-matrix';
import { RisksSkeleton } from '@/components/risks/RisksSkeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState, FilterEmptyState } from '@/components/ui/empty-state';
import {
  AlertTriangle,
  Plus,
  Search,
  FolderKanban,
  AlertCircle,
  X,
  ShieldAlert,
  ShieldCheck,
  LayoutGrid,
  Filter,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { aiApi, type AiAnalysisResponse } from '@/lib/api/ai';

export default function RisksPage() {
  return (
    <AppShell>
      <React.Suspense fallback={<RisksSkeleton />}>
        <RisksWorkspaceContent />
      </React.Suspense>
    </AppShell>
  );
}

function RisksWorkspaceContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [risks, setRisks] = React.useState<Risk[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(initialProjectId);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [criticalOnlyFilter, setCriticalOnlyFilter] = React.useState(false);
  const [selectedMatrixProb, setSelectedMatrixProb] = React.useState<RiskProbability | undefined>();
  const [selectedMatrixImpact, setSelectedMatrixImpact] = React.useState<RiskImpact | undefined>();
  const [showMatrix, setShowMatrix] = React.useState(true);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // AI Mitigation State
  const [aiMitigation, setAiMitigation] = React.useState<AiAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [showAiMitigation, setShowAiMitigation] = React.useState(false);

  // Dialog & Sheet States
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const [detailedRisk, setDetailedRisk] = React.useState<Risk | null>(null);
  const [deletingRisk, setDeletingRisk] = React.useState<Risk | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  // Load Projects on mount
  React.useEffect(() => {
    let active = true;
    listProjects({ limit: 100 })
      .then((res) => {
        if (!active) return;
        const projs = res.data ?? [];
        setProjects(projs);
        if (initialProjectId) {
          setSelectedProjectId(initialProjectId);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(formatRiskError(err, 'Failed to fetch projects list.'));
      });

    return () => {
      active = false;
    };
  }, [initialProjectId]);

  // Load Risks whenever selectedProjectId changes
  const fetchRisks = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRisks(selectedProjectId ? { projectId: selectedProjectId, limit: 100 } : { limit: 100 });
      setRisks(data);
    } catch (err) {
      setError(formatRiskError(err, 'Failed to load project risks.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    let active = true;
    listRisks(selectedProjectId ? { projectId: selectedProjectId, limit: 100 } : { limit: 100 })
      .then((data) => {
        if (!active) return;
        setRisks(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatRiskError(err, 'Failed to load project risks.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  // AI Mitigation Analysis handler
  const fetchAiMitigation = React.useCallback(async () => {
    const targetProjectId = selectedProjectId || (projects[0]?.id ?? '');
    if (!targetProjectId) {
      setAiError('Please select a project to generate AI risk mitigation insights.');
      setShowAiMitigation(true);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setShowAiMitigation(true);
    try {
      const res = await aiApi.riskMitigation(targetProjectId);
      setAiMitigation(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI mitigation service is currently unavailable.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [selectedProjectId, projects]);

  // Map projects by ID
  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const total = risks.length;
    const critical = risks.filter((r) => r.riskScore >= 6).length;
    const mitigating = risks.filter((r) => r.status === 'MITIGATING').length;
    const resolvedOrClosed = risks.filter(
      (r) => r.status === 'RESOLVED' || r.status === 'ACCEPTED' || r.status === 'CLOSED',
    ).length;
    return { total, critical, mitigating, resolvedOrClosed };
  }, [risks]);

  // Filtered risks
  const filteredRisks = React.useMemo(() => {
    return risks.filter((risk) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = risk.title.toLowerCase().includes(query);
        const matchesDesc = (risk.description ?? '').toLowerCase().includes(query);
        const matchesOwner = (risk.ownerId ?? '').toLowerCase().includes(query);
        const projName = projectMap.get(risk.projectId)?.name.toLowerCase() ?? '';
        const matchesProj = projName.includes(query);

        if (!matchesTitle && !matchesDesc && !matchesOwner && !matchesProj) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && risk.status !== statusFilter) {
        return false;
      }

      // Critical filter
      if (criticalOnlyFilter && risk.riskScore < 6) {
        return false;
      }

      // Matrix Cell Filter
      if (selectedMatrixProb && risk.probability !== selectedMatrixProb) {
        return false;
      }
      if (selectedMatrixImpact && risk.impact !== selectedMatrixImpact) {
        return false;
      }

      return true;
    });
  }, [
    risks,
    searchQuery,
    statusFilter,
    criticalOnlyFilter,
    selectedMatrixProb,
    selectedMatrixImpact,
    projectMap,
  ]);

  // Handle Create Risk
  async function handleCreateRisk(payload: CreateRiskPayload | UpdateRiskPayload) {
    const created = await createRisk(payload as CreateRiskPayload);
    setRisks((prev) => [created, ...prev]);
    return created;
  }

  // Handle Update Risk
  async function handleUpdateRisk(payload: CreateRiskPayload | UpdateRiskPayload) {
    if (!editingRisk) throw new Error('No risk selected for update.');
    const updated = await updateRisk(editingRisk.id, payload as UpdateRiskPayload);
    setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (detailedRisk?.id === updated.id) {
      setDetailedRisk(updated);
    }
    return updated;
  }

  // Handle Quick Status Change
  async function handleStatusChange(risk: Risk, newStatus: RiskStatus) {
    try {
      const updated = await updateRisk(risk.id, { status: newStatus });
      setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (detailedRisk?.id === updated.id) {
        setDetailedRisk(updated);
      }
    } catch (err) {
      setError(formatRiskError(err, 'Failed to update risk status.'));
    }
  }

  // Handle Delete Risk
  async function confirmDelete() {
    if (!deletingRisk) return;
    setDeleteLoading(true);
    try {
      await deleteRisk(deletingRisk.id);
      setRisks((prev) => prev.filter((r) => r.id !== deletingRisk.id));
      if (detailedRisk?.id === deletingRisk.id) {
        setDetailedRisk(null);
      }
      setDeletingRisk(null);
    } catch (err) {
      setError(formatRiskError(err, 'Failed to delete risk.'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const activeProjectName = selectedProjectId
    ? projectMap.get(selectedProjectId)?.name || 'Selected Project'
    : 'All Projects';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Risk Management
            </h1>
            <Badge variant="info" className="text-xs">Risk Matrix</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Identify, assess, and manage risks affecting project delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAiMitigation()}
            disabled={loading || aiLoading}
            className="gap-1.5 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
          >
            <Sparkles className={`h-4 w-4 text-indigo-600 dark:text-indigo-400 ${aiLoading ? 'animate-spin' : ''}`} />
            AI Risk Mitigation
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRisks}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManage && (
            <Button
              size="sm"
              onClick={() => setCreateFormOpen(true)}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Log Risk
            </Button>
          )}
        </div>
      </div>

      {/* AI Risk Mitigation Strategy Panel */}
      {showAiMitigation && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    AI Risk Mitigation Strategy — {activeProjectName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evidence-based analysis &amp; actionable containment recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {aiMitigation && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-2 py-0.5 font-medium ${
                      aiMitigation.generatedBy === 'ollama'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {aiMitigation.generatedBy === 'ollama'
                      ? 'Local Ollama AI Model'
                      : 'Deterministic Analysis'}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAiMitigation(false)}
                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {aiLoading ? (
              <div className="p-6 text-center space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Synthesizing project risks with Ollama backend...
                </p>
              </div>
            ) : aiError ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                <span>{aiError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchAiMitigation()}
                  className="h-6 text-[11px] border-rose-200 bg-white dark:bg-slate-900"
                >
                  Retry
                </Button>
              </div>
            ) : aiMitigation ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Panel 1: Evidence / Summary */}
                <div className="rounded-md bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    1. Evidence &amp; Summary
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {aiMitigation.summary}
                  </p>
                </div>

                {/* Panel 2: Assessment Insights */}
                <div className="rounded-md bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    2. Risk Assessment
                  </span>
                  {aiMitigation.insights && aiMitigation.insights.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                      {aiMitigation.insights.map((ins, idx) => (
                        <li key={idx} className="leading-snug">{ins}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No specific risk bottlenecks identified.</p>
                  )}
                </div>

                {/* Panel 3: Recommended Actions */}
                <div className="rounded-md bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    3. Recommended Mitigations
                  </span>
                  {aiMitigation.recommendations && aiMitigation.recommendations.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      {aiMitigation.recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-snug font-medium text-indigo-950 dark:text-indigo-200">{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No recommendations required.</p>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Project Scope Selector & Risk Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Project Selector */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:col-span-1 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4 text-primary" />
              Project Scope
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Stat 1: Total Risks */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Risks</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stat 2: Critical / High Score */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Critical Risks (Score ≥ 6)</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.critical}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stat 3: Mitigating / Resolved */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mitigating / Resolved</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.mitigating}</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolvedOrClosed}</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Error Banner */}
      {error && (
        <ErrorState
          title="Unable to load project risks"
          error={error}
          onRetry={fetchRisks}
          variant="card"
        />
      )}

      {/* 3x3 Matrix Toggle Section */}
      {risks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowMatrix((prev) => !prev)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5"
            >
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span>{showMatrix ? 'Hide 3×3 Risk Matrix' : 'Show 3×3 Risk Matrix'}</span>
            </button>
          </div>

          {showMatrix && (
            <RiskMatrix
              risks={risks}
              selectedProbability={selectedMatrixProb}
              selectedImpact={selectedMatrixImpact}
              onSelectCell={(prob, impact) => {
                setSelectedMatrixProb(prob);
                setSelectedMatrixImpact(impact);
              }}
            />
          )}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search risks by title, description, project, or owner..."
            className="pl-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status & Severity Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All Statuses
          </button>
          {RISK_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCriticalOnlyFilter((prev) => !prev)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all border ${
              criticalOnlyFilter
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
            }`}
          >
            Critical Only (≥6)
          </button>
        </div>
      </div>

      {/* Active Matrix Cell Filter Notice */}
      {(selectedMatrixProb || selectedMatrixImpact) && (
        <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-md">
          <Filter className="h-3.5 w-3.5" />
          <span>
            Filtered by Matrix Cell: <strong>Probability {selectedMatrixProb}</strong> &amp;{' '}
            <strong>Impact {selectedMatrixImpact}</strong>
          </span>
          <button
            onClick={() => {
              setSelectedMatrixProb(undefined);
              setSelectedMatrixImpact(undefined);
            }}
            className="ml-auto text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Clear Cell Filter
          </button>
        </div>
      )}

      {/* Risk Grid Content */}
      {loading ? (
        <RisksSkeleton />
      ) : filteredRisks.length === 0 ? (
        risks.length > 0 ? (
          <FilterEmptyState
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setCriticalOnlyFilter(false);
              setSelectedMatrixProb(undefined);
              setSelectedMatrixImpact(undefined);
            }}
            description="No risks match your search query, status filters, or 3×3 matrix cell selection."
          />
        ) : (
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6" />}
            title="No Risks Recorded Yet"
            description="Log a project risk entry to evaluate probability, impact severity, and mitigation."
            action={
              canManage ? (
                <Button
                  size="sm"
                  onClick={() => setCreateFormOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Log First Risk
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRisks.map((risk) => (
            <RiskCard
              key={risk.id}
              risk={risk}
              project={projectMap.get(risk.projectId)}
              canManage={canManage}
              onEdit={(r) => setEditingRisk(r)}
              onDelete={(r) => setDeletingRisk(r)}
              onViewDetail={(r) => setDetailedRisk(r)}
            />
          ))}
        </div>
      )}

      {/* Create Risk Modal Sheet */}
      {canManage && (
        <RiskForm
          mode="create"
          projects={projects}
          defaultProjectId={selectedProjectId}
          open={createFormOpen}
          onOpenChange={setCreateFormOpen}
          onSubmit={handleCreateRisk}
        />
      )}

      {/* Edit Risk Modal Sheet */}
      {canManage && (
        <RiskForm
          mode="edit"
          risk={editingRisk}
          projects={projects}
          open={Boolean(editingRisk)}
          onOpenChange={(open) => {
            if (!open) setEditingRisk(null);
          }}
          onSubmit={handleUpdateRisk}
        />
      )}

      {/* Risk Detail Drawer */}
      <RiskDetail
        risk={detailedRisk}
        project={detailedRisk ? projectMap.get(detailedRisk.projectId) : undefined}
        canManage={canManage}
        open={Boolean(detailedRisk)}
        onOpenChange={(open) => {
          if (!open) setDetailedRisk(null);
        }}
        onEdit={(r) => {
          setDetailedRisk(null);
          setEditingRisk(r);
        }}
        onDelete={(r) => {
          setDetailedRisk(null);
          setDeletingRisk(r);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Delete Confirmation Dialog */}
      {canManage && (
        <ConfirmDialog
          open={Boolean(deletingRisk)}
          onOpenChange={(open) => {
            if (!open) setDeletingRisk(null);
          }}
          title="Delete Project Risk"
          description={`Are you sure you want to permanently delete the risk "${deletingRisk?.title}"? This action cannot be undone.`}
          confirmLabel="Delete Risk"
          variant="destructive"
          loading={deleteLoading}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
