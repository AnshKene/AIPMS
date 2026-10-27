'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/common/RoleBadge';
import {
  type Role,
  isDesignatedAdmin,
  DESIGNATED_ADMIN_EMAIL,
} from '@/lib/auth/auth-storage';
import { userDirectory } from '@/lib/auth/user-directory';
import { apiClient, ApiError } from '@/lib/api/client';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Lock,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SystemUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status?: 'ACTIVE' | 'INACTIVE';
  deactivatedAt?: string | null;
  createdAt?: string;
  projectMemberships?: Array<{ projectId: string; projectName?: string; role: string }>;
}

const GLOBAL_ROLE_DETAILS: Record<
  Role,
  { label: string; tag: string; description: string; permissions: string[] }
> = {
  ADMIN: {
    label: 'System Administrator',
    tag: 'Global Platform Admin',
    description: `Exclusively reserved for the designated administrator (${DESIGNATED_ADMIN_EMAIL}). Has unrestricted authority across all workspaces, services, user accounts, and audit telemetry.`,
    permissions: [
      'Unrestricted read and write access to all platform resources',
      'Manage global user accounts and role assignments',
      'Access audit logs, workspace governance, and system health',
    ],
  },
  PROJECT_OWNER: {
    label: 'Project Owner',
    tag: 'Project Governance',
    description: 'Autonomous project leadership with authority to create projects, assign project managers, manage team structures, and transfer ownership.',
    permissions: [
      'Create and configure owned projects',
      'Assign or remove project managers and contributors',
      'Transfer project ownership and manage lifecycle (archive/unarchive)',
    ],
  },
  PROJECT_MANAGER: {
    label: 'Project Manager',
    tag: 'Workflow Execution',
    description: 'Manages authorized project operations, task schedules, sprints, risks, and report analytics within assigned projects.',
    permissions: [
      'Create, assign, and update tasks and dependencies',
      'Plan and manage sprint cycles and risks',
      'View analytics and generate project reports',
    ],
  },
  TEAM_MEMBER: {
    label: 'Team Member',
    tag: 'Contributor',
    description: 'Core project contributor. Can execute tasks, update assignment progress, and collaborate in teams.',
    permissions: [
      'View assigned projects and teams',
      'Update progress and status of assigned tasks',
      'View sprint backlogs and project milestones',
    ],
  },
  VIEWER: {
    label: 'Viewer',
    tag: 'Observer (Read-Only)',
    description: 'Observer profile restricted to read-only views of authorized projects, dashboards, and reporting metrics.',
    permissions: [
      'Read-only access to projects and tasks',
      'View sprint roadmaps and public risk registers',
      'Cannot create, edit, reassign, or delete any resources',
    ],
  },
};

interface UserRoleDialogProps {
  user: SystemUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedUser: SystemUser) => void;
}

export function UserRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserRoleDialogProps) {
  const [prevUserId, setPrevUserId] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<Role>('TEAM_MEMBER');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (user && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setSelectedRole(user.role);
    setError(null);
  }

  if (!user) return null;

  const isUserDesignatedAdmin = isDesignatedAdmin(user);
  const isTargetingAdmin = selectedRole === 'ADMIN';
  const hasChanged = selectedRole !== user.role;

  const handleSubmit = async () => {
    if (isUserDesignatedAdmin) {
      setError('Action Denied: The designated System Administrator account cannot be modified or demoted.');
      return;
    }
    if (selectedRole === 'ADMIN') {
      setError('Action Denied: The ADMIN role is exclusively reserved for the designated System Administrator.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.patch<SystemUser>(`auth/users/${user.id}/role`, {
        role: selectedRole,
      });

      // Update directory cache immediately
      userDirectory.updateUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: response.role || selectedRole,
      });
      void userDirectory.fetchDirectory();

      onSuccess({
        ...user,
        role: response.role || selectedRole,
      });

      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update user role.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidateRoles: Role[] = ['PROJECT_OWNER', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Manage Global Role & Authorization
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Update platform-level permissions for this user account. All changes are enforced by backend API guards.
            </DialogDescription>
          </DialogHeader>

          {/* User Profile Summary Card */}
          <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                fallback={userDirectory.getInitials(user.name || user.email)}
                size="md"
                className="h-10 w-10 text-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user.name || 'Unnamed User'}
                  </h4>
                  {isUserDesignatedAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                      <Lock className="h-2.5 w-2.5" />
                      Designated Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{user.email}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Current Role</p>
              <RoleBadge role={user.role} size="sm" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isUserDesignatedAdmin ? (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
                <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Protected Account Policy</span>
              </div>
              <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                This account is recognized by the backend as the primary Designated System Administrator.
                Its global role is permanently locked to <span className="font-semibold">ADMIN</span> to prevent accidental platform lockout.
              </p>
            </div>
          ) : (
            <>
              {/* Role Selection Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select New Global Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {candidateRoles.map((r) => {
                    const isSelected = selectedRole === r;
                    const details = GLOBAL_ROLE_DETAILS[r];
                    return (
                      <div
                        key={r}
                        onClick={() => setSelectedRole(r)}
                        className={cn(
                          'p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-1.5',
                          isSelected
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 shadow-xs ring-1 ring-purple-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <RoleBadge role={r} size="sm" showIcon={false} />
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                          {details.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permission Breakdown for Selected Target Role */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Permission Scope: {GLOBAL_ROLE_DETAILS[selectedRole].label}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    {GLOBAL_ROLE_DETAILS[selectedRole].tag}
                  </span>
                </div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] list-disc list-inside">
                  {GLOBAL_ROLE_DETAILS[selectedRole].permissions.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Transition Indicator */}
              {hasChanged && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Role change pending confirmation</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                    <span>{user.role}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-purple-700 dark:text-purple-300 font-bold">{selectedRole}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          {!isUserDesignatedAdmin && (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !hasChanged || isTargetingAdmin}
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Applying to Server...</span>
                </>
              ) : (
                <span>Confirm & Apply Role</span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
