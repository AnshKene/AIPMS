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
import { userDirectory } from '@/lib/auth/user-directory';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { isDesignatedAdmin } from '@/lib/auth/auth-storage';
import type { SystemUser } from './UserRoleDialog';
import type { Project } from '@/lib/api/projects';
import {
  AlertTriangle,
  Lock,
  Loader2,
  Trash2,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface DeleteUserDialogProps {
  user: SystemUser | null;
  ownedProjects?: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (deletedUserId: string) => void;
}

export function DeleteUserDialog({
  user,
  ownedProjects = [],
  open,
  onOpenChange,
  onSuccess,
}: DeleteUserDialogProps) {
  const { token, user: currentUser } = useAuth();
  const [confirmText, setConfirmText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  const isUserDesignatedAdmin = isDesignatedAdmin(user);
  const isSelf = currentUser && currentUser.email.toLowerCase() === user.email.toLowerCase();
  const hasOwnedProjects = ownedProjects.length > 0;
  const isInactive = user.status === 'INACTIVE';

  // Two-step deletion requirement: User MUST be deactivated first!
  const isEligibleForDeletion =
    !isUserDesignatedAdmin && !isSelf && !hasOwnedProjects && isInactive;

  // User must type target email or "DELETE" to activate confirmation
  const isConfirmationMatched =
    confirmText.trim().toLowerCase() === user.email.toLowerCase() ||
    confirmText.trim().toUpperCase() === 'DELETE';

  const canConfirm = isEligibleForDeletion && isConfirmationMatched;

  const handleDelete = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await authApi.deleteUser(user.id, token);
      userDirectory.removeUser(user.id);
      void userDirectory.fetchDirectory(token);
      onSuccess(user.id);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to permanently delete user account. Please verify network connectivity.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-red-50/80 to-transparent dark:from-red-950/30 dark:to-transparent border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Permanently Delete User Account
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Irreversible operation: Permanently removes identity credentials while preserving historical audit records
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Account Summary */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                fallback={userDirectory.getInitials(user.name || user.email)}
                size="sm"
                className="h-9 w-9 text-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user.name || 'Unnamed User'}
                  </span>
                  <RoleBadge role={user.role} size="sm" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate block">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Status
              </span>
              <span
                className={`text-xs font-bold ${
                  user.status === 'INACTIVE'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {user.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Ineligible: Designated Admin */}
          {isUserDesignatedAdmin && (
            <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-950/30 flex items-start gap-2.5 text-xs text-purple-700 dark:text-purple-300">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <div>
                <strong>Designated System Administrator Protected:</strong> The system owner cannot be deleted.
              </div>
            </div>
          )}

          {/* Ineligible: Self-deletion */}
          {isSelf && !isUserDesignatedAdmin && (
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/30 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <strong>Self-Deletion Prohibited:</strong> Administrators cannot permanently delete their own account.
              </div>
            </div>
          )}

          {/* Two-step Prerequisite: Account must be deactivated first */}
          {!isInactive && !isUserDesignatedAdmin && !isSelf && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <strong>Two-Step Deletion Policy Required:</strong>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  For safety and compliance, accounts must be <strong>deactivated first</strong> before permanent deletion can take place.
                  Please close this dialog and click <strong>Deactivate</strong> on this user before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Owned Projects Conflict */}
          {hasOwnedProjects && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <strong>Project Ownership Conflict:</strong>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  User is the registered owner of <strong>{ownedProjects.length}</strong> project(s):{' '}
                  <span className="font-semibold">{ownedProjects.map((p) => p.name).join(', ')}</span>.
                  You must transfer project ownership to another user before this account can be deleted.
                </p>
              </div>
            </div>
          )}

          {/* Impact and Data Retention Rules */}
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/20 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3 w-3 text-slate-400" />
              Data Retention & Referential Integrity Rules
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Identity permanently deleted:</strong> User record will be erased from Supabase Auth identity provider.
              </li>
              <li>
                <strong>Membership unlinked:</strong> Project and team memberships will be deleted.
              </li>
              <li>
                <strong>Tasks preserved:</strong> Assigned tasks will be unassigned (<code>assignee: null</code>) so projects, sprints, and task definitions remain intact.
              </li>
              <li>
                <strong>Audit logs retained:</strong> Compliance and security audit records are permanently retained and cannot be deleted.
              </li>
            </ul>
          </div>

          {/* Explicit Confirmation Input */}
          {isEligibleForDeletion && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                To confirm permanent deletion, type <code className="text-red-600 dark:text-red-400 font-bold">{user.email}</code> or <code className="text-red-600 dark:text-red-400 font-bold">DELETE</code>:
              </label>
              <input
                type="text"
                placeholder={user.email}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={!canConfirm || isSubmitting}
            className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              'Permanently Delete Account'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
