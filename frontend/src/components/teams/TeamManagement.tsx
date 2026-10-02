'use client';

import * as React from 'react';
import {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type Team,
  type CreateTeamPayload,
  type UpdateTeamPayload,
  formatTeamError,
} from '@/lib/api/teams';
import { TeamCard } from './team-card';
import { TeamForm } from './team-form';
import { TeamDetail } from './team-detail';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, Plus, AlertCircle } from 'lucide-react';

interface TeamManagementProps {
  projectId: string;
}

export function TeamManagement({ projectId }: TeamManagementProps) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeTeam, setActiveTeam] = React.useState<Team | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    listTeams({
      projectId,
      page: 1,
      limit: 50,
    })
      .then((response) => {
        if (!cancelled) {
          setTeams(response.data || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatTeamError(err, 'Failed to load project teams.'));
          setTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function reloadTeams() {
    setLoading(true);
    setError(null);
    listTeams({ projectId, page: 1, limit: 50 })
      .then((res) => setTeams(res.data || []))
      .catch((err) => setError(formatTeamError(err)))
      .finally(() => setLoading(false));
  }

  function handleTeamCreated(newTeam: Team) {
    setTeams((current) => [newTeam, ...current]);
    setActiveTeam(newTeam);
    setDetailOpen(true);
  }

  function handleTeamUpdated(updatedTeam: Team) {
    setTeams((current) =>
      current.map((team) => (team.id === updatedTeam.id ? updatedTeam : team)),
    );
    if (activeTeam?.id === updatedTeam.id) {
      setActiveTeam(updatedTeam);
    }
  }

  function handleTeamDeleted(teamId: string) {
    setTeams((current) => current.filter((team) => team.id !== teamId));
    if (activeTeam?.id === teamId) {
      setDetailOpen(false);
      setActiveTeam(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-36 rounded-xl border border-slate-200 bg-white p-5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Project Teams
          </h3>
          <p className="text-xs text-slate-500">
            Allocate people and manage team assignments for this project.
          </p>
        </div>

        <TeamForm
          mode="create"
          defaultProjectId={projectId}
          trigger={
            <Button size="sm" className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Create Team
            </Button>
          }
          onSubmit={(payload) => createTeam(payload as CreateTeamPayload)}
          onSuccess={handleTeamCreated}
        />
      </div>

      {/* Error notification */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={reloadTeams}
            className="ml-auto text-xs h-6 px-2 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* List / Empty state */}
      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No teams yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first team to organize developer memberships and assignments for this project.
          </p>
          <TeamForm
            mode="create"
            defaultProjectId={projectId}
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5 mt-2 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Create Team
              </Button>
            }
            onSubmit={(payload) => createTeam(payload as CreateTeamPayload)}
            onSuccess={handleTeamCreated}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onSelect={(t) => {
                setActiveTeam(t);
                setDetailOpen(true);
              }}
              onEdit={(t) => setEditingTeam(t)}
              onDelete={async (t) => {
                const confirmed = window.confirm(
                  `Delete team "${t.name}"? This action cannot be undone.`,
                );
                if (confirmed) {
                  try {
                    await deleteTeam(t.id);
                    handleTeamDeleted(t.id);
                  } catch (err) {
                    alert(formatTeamError(err, 'Failed to delete team.'));
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Detail Slide-over Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full max-w-xl overflow-y-auto">
          {activeTeam && (
            <TeamDetail
              teamId={activeTeam.id}
              initialTeam={activeTeam}
              onTeamUpdated={handleTeamUpdated}
              onTeamDeleted={(id) => {
                handleTeamDeleted(id);
                setDetailOpen(false);
              }}
              onBack={() => setDetailOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Card Edit Form Trigger */}
      {editingTeam && (
        <TeamForm
          mode="edit"
          team={editingTeam}
          trigger={<span className="hidden" />}
          onSubmit={(payload) =>
            updateTeam(editingTeam.id, payload as UpdateTeamPayload)
          }
          onSuccess={(updated) => {
            handleTeamUpdated(updated);
            setEditingTeam(null);
          }}
        />
      )}
    </div>
  );
}