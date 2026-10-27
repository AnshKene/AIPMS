'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/common/RoleBadge';
import { UserSelector } from '@/components/common/UserSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UserCheck,
  Plus,
  Trash2,
  Users,
  Loader2,
  Crown,
  Search,
  Shield,
  Eye,
  AlertTriangle,
  UserCog,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  type ProjectMember,
  type ProjectMemberRole,
} from '@/lib/api/projects';
import { DESIGNATED_ADMIN_ID } from '@/lib/auth/auth-storage';
import { userDirectory } from '@/lib/auth/user-directory';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';

interface ProjectMembersCardProps {
  projectId: string;
  projectOwnerId?: string;
  isOwner: boolean;
  isAdmin: boolean;
  onMembersUpdated?: (members: ProjectMember[]) => void;
}

const PROJECT_ROLE_DESCRIPTIONS: Record<
  ProjectMemberRole,
  { label: string; badgeLabel: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PROJECT_MANAGER: {
    label: 'Project Manager (Assigned PM)',
    badgeLabel: 'Project Manager',
    description: 'Manages project execution, creates/updates tasks, plans sprints, and tracks project risks.',
    icon: Shield,
  },
  MEMBER: {
    label: 'Member (Contributor)',
    badgeLabel: 'Member',
    description: 'Executes assigned tasks, updates task progress and status, and participates in sprints.',
    icon: UserCheck,
  },
  VIEWER: {
    label: 'Viewer (Read-Only)',
    badgeLabel: 'Viewer',
    description: 'Has read-only access to view the project overview, tasks, sprints, risks, and reports.',
    icon: Eye,
  },
};

export function ProjectMembersCard({
  projectId,
  projectOwnerId,
  isOwner,
  isAdmin,
  onMembersUpdated,
}: ProjectMembersCardProps) {
  const canManageMembers = isOwner || isAdmin;

  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Add Member Modal State
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [targetUserId, setTargetUserId] = React.useState('');
  const [targetRole, setTargetRole] = React.useState<ProjectMemberRole>('MEMBER');
  const [submittingAdd, setSubmittingAdd] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  // Edit Role Modal State
  const [editingMember, setEditingMember] = React.useState<ProjectMember | null>(null);
  const [newRoleForEdit, setNewRoleForEdit] = React.useState<ProjectMemberRole>('MEMBER');
  const [submittingEdit, setSubmittingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Remove Member Confirm State
  const [removingMember, setRemovingMember] = React.useState<ProjectMember | null>(null);
  const [submittingRemove, setSubmittingRemove] = React.useState(false);

  const fetchMembers = React.useCallback(async () => {
    try {
      const data = await listProjectMembers(projectId);
      setMembers(data);
      onMembersUpdated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project members.');
    } finally {
      setLoading(false);
    }
  }, [projectId, onMembersUpdated]);

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await listProjectMembers(projectId);
        if (!ignore) {
          setMembers(data);
          setError(null);
          onMembersUpdated?.(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load project members.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [projectId, onMembersUpdated]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setTargetUserId('');
    setTargetRole('MEMBER');
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = targetUserId.trim();
    if (!trimmedId) {
      setAddError('Please select or specify a user.');
      return;
    }

    if (trimmedId === DESIGNATED_ADMIN_ID) {
      setAddError('The System Administrator cannot be assigned as a project member. Global administrative access already applies.');
      return;
    }

    if (projectOwnerId && trimmedId === projectOwnerId) {
      setAddError('The project owner is already the designated owner and cannot be added as a member.');
      return;
    }

    setSubmittingAdd(true);
    setAddError(null);
    try {
      await addProjectMember(projectId, { userId: trimmedId, role: targetRole });
      setAddModalOpen(false);
      setSuccessMessage('Project member successfully assigned.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchMembers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAddError('Conflict: This user is already assigned to this project.');
      } else if (err instanceof ApiError && err.status === 403) {
        setAddError('Permission Denied: Only the project owner or system administrator can assign project members.');
      } else {
        setAddError(err instanceof Error ? err.message : 'Failed to assign project member.');
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEditRole = (member: ProjectMember) => {
    setEditingMember(member);
    setNewRoleForEdit(member.role);
    setEditError(null);
  };

  const handleSaveRoleChange = async () => {
    if (!editingMember) return;
    if (editingMember.role === newRoleForEdit) {
      setEditingMember(null);
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);

    try {
      // Backend enforces remove + add to change project member role
      await removeProjectMember(projectId, editingMember.userId);
      await addProjectMember(projectId, { userId: editingMember.userId, role: newRoleForEdit });

      setEditingMember(null);
      setSuccessMessage(`Role updated to ${PROJECT_ROLE_DESCRIPTIONS[newRoleForEdit].badgeLabel}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchMembers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setEditError('Permission Denied: Only project owner or administrator can modify roles.');
      } else {
        setEditError(err instanceof Error ? err.message : 'Failed to change member role.');
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    setSubmittingRemove(true);
    try {
      await removeProjectMember(projectId, removingMember.userId);
      setRemovingMember(null);
      setSuccessMessage('Member successfully removed from project.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member from project.');
      setRemovingMember(null);
    } finally {
      setSubmittingRemove(false);
    }
  };

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const profile = userDirectory.getUser(m.userId);
      return (
        m.userId.toLowerCase().includes(q) ||
        profile.name.toLowerCase().includes(q) ||
        profile.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery]);

  const ownerProfile = projectOwnerId ? userDirectory.getUser(projectOwnerId) : null;

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Project Team & Roles
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assigned managers, members, and observers for this project workspace.
            </p>
          </div>
        </div>

        {canManageMembers && (
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Success Alert */}
        {successMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar if multiple members */}
        {members.length > 2 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter members by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Project Owner Row (Always displayed at top) */}
        {ownerProfile && (
          <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                fallback={userDirectory.getInitials(ownerProfile.name || ownerProfile.email)}
                size="sm"
                className="h-8 w-8 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {ownerProfile.name || ownerProfile.email}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <Crown className="h-2.5 w-2.5 text-amber-600" />
                    Project Owner
                  </span>
                </div>
                {ownerProfile.email && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {ownerProfile.email}
                  </p>
                )}
              </div>
            </div>

            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider shrink-0">
              Primary Authority
            </span>
          </div>
        )}

        {/* Member List */}
        {loading ? (
          <div className="py-6 flex justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Loading project team members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-6 text-slate-400 space-y-1">
            <Users className="h-6 w-6 mx-auto mb-1 opacity-40" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {searchQuery ? 'No members match your search' : 'No additional members assigned'}
            </p>
            <p className="text-[11px] text-slate-500">
              {canManageMembers
                ? 'Assign Project Managers or team contributors to collaborate in this workspace.'
                : 'Project Managers and members assigned by the owner will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredMembers.map((m) => {
              const profile = userDirectory.getUser(m.userId);
              const initials = userDirectory.getInitials(profile.name || profile.email);

              return (
                <div
                  key={m.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar
                      fallback={initials}
                      size="sm"
                      className="h-8 w-8 text-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {profile.name}
                        </span>
                        <RoleBadge role={m.role} scope="project" size="sm" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {profile.email ? (
                          <span className="truncate">{profile.email}</span>
                        ) : (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                            <span className="truncate max-w-[140px]">{m.userId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyId(m.userId)}
                              title="Copy User ID"
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {copiedId === m.userId ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageMembers && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditRole(m)}
                        className="h-7 px-2 text-[11px] text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1"
                        title="Change role"
                      >
                        <UserCog className="h-3 w-3" />
                        <span>Role</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemovingMember(m)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Member Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Assign Project Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an account and assign a project role. Access permissions are verified on the backend.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 py-2 text-xs">
            {addError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {addError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Target User <span className="text-rose-500">*</span>
              </label>
              <UserSelector
                value={targetUserId}
                onChange={setTargetUserId}
                excludeUserIds={[...members.map((m) => m.userId), ...(projectOwnerId ? [projectOwnerId] : [])]}
                placeholder="Search by name, email, or select user..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Project Role
              </label>
              <div className="space-y-2">
                {(['PROJECT_MANAGER', 'MEMBER', 'VIEWER'] as ProjectMemberRole[]).map((r) => {
                  const isSelected = targetRole === r;
                  const item = PROJECT_ROLE_DESCRIPTIONS[r];
                  const Icon = item.icon;
                  return (
                    <div
                      key={r}
                      onClick={() => setTargetRole(r)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5',
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', isSelected ? 'text-blue-600' : 'text-slate-400')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.label}
                          </span>
                          <RoleBadge role={r} scope="project" size="sm" showIcon={false} />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                disabled={submittingAdd}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAdd || !targetUserId.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                {submittingAdd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={Boolean(editingMember)} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <UserCog className="h-5 w-5 text-blue-600" />
              Update Project Role
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modify the assigned role for this member within this project.
            </DialogDescription>
          </DialogHeader>

          {editingMember && (
            <div className="space-y-4 py-2 text-xs">
              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {editError}
                </div>
              )}

              {/* User Identity Display */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center gap-3">
                <Avatar
                  fallback={userDirectory.getInitials(editingMember.userId)}
                  size="sm"
                  className="h-8 w-8 text-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {userDirectory.getUser(editingMember.userId).name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    {editingMember.userId}
                  </p>
                </div>
                <RoleBadge role={editingMember.role} scope="project" size="sm" />
              </div>

              {/* Target Role Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Select New Project Role
                </label>
                <div className="space-y-2">
                  {(['PROJECT_MANAGER', 'MEMBER', 'VIEWER'] as ProjectMemberRole[]).map((r) => {
                    const isSelected = newRoleForEdit === r;
                    const item = PROJECT_ROLE_DESCRIPTIONS[r];
                    return (
                      <div
                        key={r}
                        onClick={() => setNewRoleForEdit(r)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5',
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.label}
                            </span>
                            <RoleBadge role={r} scope="project" size="sm" showIcon={false} />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                  disabled={submittingEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={submittingEdit || newRoleForEdit === editingMember.role}
                  onClick={handleSaveRoleChange}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                >
                  {submittingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Role Change
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={Boolean(removingMember)} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Remove Member from Project
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to remove this member from the project? They will lose access to project resources.
            </DialogDescription>
          </DialogHeader>

          {removingMember && (
            <div className="py-2 text-xs space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {userDirectory.getUser(removingMember.userId).name}
                </p>
                <RoleBadge role={removingMember.role} scope="project" size="sm" />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRemovingMember(null)}
              disabled={submittingRemove}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingRemove}
              onClick={handleConfirmRemove}
              className="text-xs gap-1.5"
            >
              {submittingRemove && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
