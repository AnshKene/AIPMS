'use client';

import * as React from 'react';
import {
  type TeamMember,
  type TeamRole,
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  listTeamMembers,
  addTeamMember,
  formatTeamError,
} from '@/lib/api/teams';
import { TeamMemberRow } from './team-member-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMembersProps {
  teamId: string;
  onMembersCountChange?: (count: number) => void;
  className?: string;
}

export function TeamMembers({
  teamId,
  onMembersCountChange,
  className,
}: TeamMembersProps) {
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Add Member State
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [userIdInput, setUserIdInput] = React.useState('');
  const [roleInput, setRoleInput] = React.useState<TeamRole>('MEMBER');
  const [addingMember, setAddingMember] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addSuccess, setAddSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    listTeamMembers(teamId, {
      page,
      limit: 20,
    })
      .then((response) => {
        if (!cancelled) {
          setMembers(response.data || []);
          setTotalPages(response.meta?.totalPages || 1);
          const count = response.meta?.total ?? response.data?.length ?? 0;
          setTotalCount(count);
          onMembersCountChange?.(count);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatTeamError(err, 'Failed to load team members.'));
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
  }, [teamId, page, onMembersCountChange]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    const trimmedUserId = userIdInput.trim();
    if (!trimmedUserId) {
      setAddError('Please enter a User ID (UUID).');
      return;
    }

    setAddingMember(true);
    try {
      const newMember = await addTeamMember(teamId, {
        userId: trimmedUserId,
        role: roleInput,
      });

      setMembers((prev) => [newMember, ...prev]);
      const newTotal = totalCount + 1;
      setTotalCount(newTotal);
      onMembersCountChange?.(newTotal);
      setUserIdInput('');
      setRoleInput('MEMBER');
      setAddSuccess('Member added successfully.');
      setTimeout(() => setAddSuccess(null), 3000);
      setShowAddForm(false);
    } catch (err) {
      setAddError(formatTeamError(err, 'Failed to add team member.'));
    } finally {
      setAddingMember(false);
    }
  }

  function handleMemberUpdated(updated: TeamMember) {
    setMembers((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
  }

  function handleMemberRemoved(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    const newTotal = Math.max(0, totalCount - 1);
    setTotalCount(newTotal);
    onMembersCountChange?.(newTotal);
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Team Members
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {totalCount}
          </span>
        </div>

        {!showAddForm && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAddForm(true);
              setAddError(null);
            }}
            className="h-8 gap-1.5 text-xs border-slate-200 hover:bg-slate-50"
          >
            <UserPlus className="h-3.5 w-3.5 text-blue-600" />
            Add Member
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {addSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{addSuccess}</span>
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-blue-600" />
              Add Member to Team
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddMember} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  User ID (UUID)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  disabled={addingMember}
                  className="h-8 text-xs font-mono bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Role
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as TeamRole)}
                  disabled={addingMember}
                  className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {TEAM_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {TEAM_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {addError && (
              <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50/80 p-2 rounded border border-red-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setAddError(null);
                }}
                disabled={addingMember}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addingMember}
                className="h-7 text-xs gap-1.5"
              >
                {addingMember ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>Add Member</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              listTeamMembers(teamId, { page, limit: 20 })
                .then((res) => {
                  setMembers(res.data || []);
                  setError(null);
                })
                .catch((e) => setError(formatTeamError(e)))
                .finally(() => setLoading(false));
            }}
            className="ml-auto text-xs text-red-700 hover:bg-red-100 h-6 px-2"
          >
            Retry
          </Button>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mx-auto text-slate-400">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-800">No members yet</h4>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Add members using their User ID to allocate work and track team capacity.
          </p>
          {!showAddForm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="mt-2 h-7 text-xs gap-1.5"
            >
              <UserPlus className="h-3 w-3" />
              Add First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onMemberUpdated={handleMemberUpdated}
              onMemberRemoved={handleMemberRemoved}
            />
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setLoading(true);
                  }}
                  disabled={page <= 1 || loading}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    setLoading(true);
                  }}
                  disabled={page >= totalPages || loading}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
