'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
} from 'lucide-react';

export default function RisksPage() {
  const [risks, setRisks] = React.useState<Risk[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [criticalOnlyFilter, setCriticalOnlyFilter] = React.useState(false);
  const [selectedMatrixProb, setSelectedMatrixProb] = React.useState<RiskProbability | undefined>();
  const [selectedMatrixImpact, setSelectedMatrixImpact] = React.useState<RiskImpact | undefined>();
  const [showMatrix, setShowMatrix] = React.useState(true);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(formatRiskError(err, 'Failed to fetch projects.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Load Risks whenever selectedProjectId changes
  const fetchRisks = React.useCallback(async () => {
    if (!selectedProjectId) {
      setRisks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listRisks({ projectId: selectedProjectId });
      setRisks(data);
    } catch (err) {
      setError(formatRiskError(err, 'Failed to fetch project risks.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    let active = true;
    if (!selectedProjectId) {
      return;
    }

    listRisks({ projectId: selectedProjectId })
      .then((data) => {
        if (!active) return;
        setRisks(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(formatRiskError(err, 'Failed to fetch project risks.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const total = risks.length;
    const critical = risks.filter((r) => r.riskScore >= 6).length;
    const mitigating = risks.filter((r) => r.status === 'MITIGATING').length;
    const resolvedOrClosed = risks.filter(
      (r) => r.status === 'RESOLVED' || r.status === 'CLOSED',
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
        if (!matchesTitle && !matchesDesc && !matchesOwner) return false;
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

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Risk Management Matrix
              </h1>
              <Badge variant="info">Risk Service</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Identify, evaluate, score (probability × impact), and mitigate software project bottlenecks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRisks}
              disabled={loading || !selectedProjectId}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateFormOpen(true)}
              disabled={!selectedProjectId}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Log Risk
            </Button>
          </div>
        </div>

        {/* Project Selector & Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Project Selector */}
          <Card className="border-slate-200 bg-white md:col-span-1 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FolderKanban className="h-4 w-4 text-indigo-600" />
                Active Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {projects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </CardContent>
          </Card>

          {/* Stat 1: Total Risks */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Total Risks</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Stat 2: Critical / High Score */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">High / Critical (Score ≥ 6)</p>
                <p className="text-2xl font-bold text-rose-600">{stats.critical}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Stat 3: Mitigating & Resolved */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">Mitigating / Resolved</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600">{stats.mitigating}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-2xl font-bold text-emerald-600">{stats.resolvedOrClosed}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-8 w-8 p-0 text-rose-700 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 3x3 Matrix Toggle Section */}
        {risks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowMatrix((prev) => !prev)}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <LayoutGrid className="h-4 w-4 text-indigo-600" />
                <span>{showMatrix ? 'Hide Risk Matrix Heatmap' : 'Show 3×3 Risk Matrix Heatmap'}</span>
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

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search risks by title, description, or owner..."
              className="pl-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              🔥 Critical Only (≥6)
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedMatrixProb || selectedMatrixImpact) && (
          <div className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-md">
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
              className="ml-auto text-indigo-600 hover:text-indigo-900 font-semibold underline"
            >
              Reset Cell Filter
            </button>
          </div>
        )}

        {/* Risk Grid Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-slate-200 bg-white p-6 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-12 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredRisks.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">
              {risks.length === 0 ? 'No Risks Logged Yet' : 'No Risks Match Filter Criteria'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {risks.length === 0
                ? 'Create a new project risk entry to evaluate probability, severity, and mitigation.'
                : 'Try adjusting your search query, status filters, or matrix cell selection.'}
            </p>
            {risks.length === 0 && (
              <Button
                size="sm"
                onClick={() => setCreateFormOpen(true)}
                disabled={!selectedProjectId}
                className="gap-1.5 mt-2"
              >
                <Plus className="h-4 w-4" />
                Log First Risk
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRisks.map((risk) => (
              <RiskCard
                key={risk.id}
                risk={risk}
                onEdit={(r) => setEditingRisk(r)}
                onDelete={(r) => setDeletingRisk(r)}
                onViewDetail={(r) => setDetailedRisk(r)}
              />
            ))}
          </div>
        )}

        {/* Create Risk Modal Sheet */}
        <RiskForm
          mode="create"
          projects={projects}
          defaultProjectId={selectedProjectId}
          open={createFormOpen}
          onOpenChange={setCreateFormOpen}
          onSubmit={handleCreateRisk}
        />

        {/* Edit Risk Modal Sheet */}
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

        {/* Risk Detail Drawer */}
        <RiskDetail
          risk={detailedRisk}
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
      </div>
    </AppShell>
  );
}
