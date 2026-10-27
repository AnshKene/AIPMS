'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type TeamMember,
  type TeamRole,
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  updateTeamMember,
  removeTeamMember,
  formatTeamError,
} from '@/lib/api/teams';
import { userDirectory } from '@/lib/auth/user-directory';
import {
  Crown,
  Trash2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMemberRowProps {
  member: TeamMember;
  onMemberUpdated: (updatedMember: TeamMember) => void;
  onMemberRemoved: (memberId: string) => void;
  canManage?: boolean;
  disabled?: boolean;
}

export function TeamMemberRow({
  member,
  onMemberUpdated,
  onMemberRemoved,
  canManage = true,
  disabled = false,
}: TeamMemberRowProps) {
  const [updatingRole, setUpdatingRole] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const directoryVersion = React.useSyncExternalStore(
    (cb) => userDirectory.subscribe(cb),
    () => userDirectory.getVersion(),
    () => 0,
  );

  const profile = React.useMemo(() => userDirectory.getUser(member.userId), [member.userId, directoryVersion]);
  const initials = userDirectory.getInitials(profile.name || profile.email);

  async function handleRoleChange(newRole: TeamRole) {
    if (newRole === member.role || updatingRole || disabled || !canManage) return;
    setUpdatingRole(true);
    setError(null);
    try {
      const updated = await updateTeamMember(member.teamId, member.id, {
        role: newRole,
      });
      onMemberUpdated(updated);
    } catch (err) {
      setError(formatTeamError(err, 'Failed to update member role.'));
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleRemove() {
    if (!canManage) return;
    setRemoving(true);
    setError(null);
    try {
      await removeTeamMember(member.teamId, member.id);
      onMemberRemoved(member.id);
      setConfirmDelete(false);
    } catch (err) {
      setError(formatTeamError(err, 'Failed to remove member.'));
      setRemoving(false);
    }
  }

  function handleCopyUserId() {
    navigator.clipboard.writeText(member.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          fallback={initials}
          className={cn(
            'h-9 w-9 text-xs font-semibold shrink-0 border',
            member.role === 'TEAM_LEAD'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60 ring-1 ring-amber-300/60'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          )}
        />
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {profile.name}
            </span>
            {member.role === 'TEAM_LEAD' && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] py-0 px-1.5 font-semibold"
              >
                <Crown className="h-2.5 w-2.5 text-amber-500" />
                Team Lead
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 flex-wrap">
            {profile.email ? (
              <span className="truncate">{profile.email}</span>
            ) : (
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span className="truncate max-w-[140px]">{member.userId}</span>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  title="Copy User ID"
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {error && (
          <span className="text-[11px] text-red-600 dark:text-red-400 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}

        {/* Role Selector or Display Badge */}
        {canManage ? (
          <div className="relative">
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
              disabled={disabled || updatingRole || removing}
              className={cn(
                'h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                member.role === 'TEAM_LEAD' ? 'font-semibold text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30' : '',
              )}
            >
              {TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {updatingRole && (
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
              </div>
            )}
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">
            {TEAM_ROLE_LABELS[member.role]}
          </Badge>
        )}

        {/* Remove Member Trigger */}
        {canManage && (!confirmDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={disabled || updatingRole || removing}
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            title="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md p-1">
            <span className="text-[11px] font-medium text-red-700 dark:text-red-300 px-1 hidden md:inline">
              Remove?
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="h-6 px-2 text-[11px] gap-1"
            >
              {removing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Yes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={removing}
              className="h-6 px-2 text-[11px] bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              Cancel
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
