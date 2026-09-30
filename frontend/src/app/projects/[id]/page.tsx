'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { ProjectForm } from '@/components/projects/ProjectForm';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Pencil,
  Archive,
  FolderKanban,
  CalendarDays,
  User,
  Clock,
} from 'lucide-react';
import {
  getProject,
  updateProject,
  archiveProject,
  type Project,
  type UpdateProjectPayload,
} from '@/lib/api/projects';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 border border-slate-200 shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm text-slate-800">{value}</div>
      </div>
    </div>
  );
}

// ─── Archive Confirm ─────────────────────────────────────────────────────────

function ArchiveButton({
  projectId,
  projectName,
  disabled,
  onArchived,
}: {
  projectId: string;
  projectName: string;
  disabled: boolean;
  onArchived: (project: Project) => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const result = await archiveProject(projectId);
      onArchived(result);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project.');
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        id="archive-project-btn"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        <Archive className="h-4 w-4" />
        Archive
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-600">
        Archive <span className="font-semibold">&ldquo;{projectName}&rdquo;</span>? This sets the
        status to ARCHIVED. It is not permanent.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          id="archive-confirm-btn"
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={handleArchive}
          className="gap-1.5"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Confirm Archive
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    getProject(id)
      .then((data) => {
        if (!isCancelled) {
          setProject(data);
          setError(null);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load project.';
          if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
            setNotFound(true);
          } else {
            setError(msg);
          }
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id, refreshKey]);

  function handleRetry() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  function handleUpdated(updated: Project) {
    setProject(updated);
  }

  function handleArchived(archived: Project) {
    setProject(archived);
  }

  const isArchived = project?.status === 'ARCHIVED';

  // ── Loading ──
  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AppShell>
    );
  }

  // ── Not Found ──
  if (notFound) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <div>
            <p className="text-base font-semibold text-slate-800">Project not found</p>
            <p className="text-sm text-slate-500 mt-1">
              The project you are looking for does not exist or has been removed.
            </p>
          </div>
          <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (error || !project) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400" />
          <div>
            <p className="text-base font-semibold text-slate-800">Failed to load project</p>
            <p className="text-sm text-slate-500 mt-1">{error ?? 'An unexpected error occurred.'}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Retry
            </Button>
            <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Projects
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Detail View ──
  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        {/* Back navigation */}
        <div>
          <Link
            href="/projects"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'gap-1.5 text-slate-500 hover:text-slate-800 -ml-2',
            })}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-600 shrink-0" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            </div>
            <ProjectStatusBadge status={project.status} />
            {project.description && (
              <p className="text-sm text-slate-500 mt-1">{project.description}</p>
            )}
          </div>

          <div className="flex items-start gap-2 shrink-0">
            {/* Edit — disabled if archived */}
            {!isArchived && (
              <ProjectForm
                mode="edit"
                project={project}
                trigger={
                  <Button id="edit-project-btn" size="sm" variant="outline" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                }
                onSubmit={(payload) => updateProject(project.id, payload as UpdateProjectPayload)}
                onSuccess={handleUpdated}
              />
            )}

            {/* Archive — disabled if already archived */}
            {!isArchived && (
              <ArchiveButton
                projectId={project.id}
                projectName={project.name}
                disabled={isArchived}
                onArchived={handleArchived}
              />
            )}

            {isArchived && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-slate-400 border-slate-200 cursor-default"
                disabled
              >
                <Archive className="h-3.5 w-3.5" />
                Archived
              </Button>
            )}
          </div>
        </div>

        {/* Detail Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600 font-semibold uppercase tracking-wider">
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow
              icon={CalendarDays}
              label="Start Date"
              value={formatDate(project.startDate)}
            />
            <DetailRow
              icon={CalendarDays}
              label="End Date"
              value={formatDate(project.endDate)}
            />
            <DetailRow
              icon={User}
              label="Owner ID"
              value={
                <span className="font-mono text-xs text-slate-600">{project.ownerId}</span>
              }
            />
            <DetailRow
              icon={Clock}
              label="Created"
              value={formatDateTime(project.createdAt)}
            />
            <DetailRow
              icon={Clock}
              label="Last Updated"
              value={formatDateTime(project.updatedAt)}
            />
          </CardContent>
        </Card>

        {/* Archived notice */}
        {isArchived && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
            <Archive className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              This project is archived. It is read-only and will not appear in active filters.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
