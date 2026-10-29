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
  ShieldAlert,
  Info,
} from 'lucide-react';

interface DeactivateUserDialogProps {
  user: SystemUser | null;
  ownedProjects?: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedUser: SystemUser) => void;
}

export function DeactivateUserDialog({
  user,
  ownedProjects = [],
  open,
  onOpenChange,
  onSuccess,
}: DeactivateUserDialogProps) {
  const { token, user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!user) return null;

  const isUserDesignatedAdmin = isDesignatedAdmin(user);
  const isSelf = currentUser && currentUser.email.toLowerCase() === user.email.toLowerCase();
  const hasOwnedProjects = ownedProjects.length > 0;
  const isAlreadyInactive = user.status === 'INACTIVE';

  const canDeactivate = !isUserDesignatedAdmin && !isSelf && !hasOwnedProjects && !isAlreadyInactive;

  const handleDeactivate = async () => {
    if (!canDeactivate) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authApi.deactivateUser(user.id, token);
      const updatedUser: SystemUser = {
        ...user,
        status: 'INACTIVE',
        deactivatedAt: res.deactivatedAt || new Date().toISOString(),
      };
      userDirectory.updateUser(updatedUser);
      void userDirectory.fetchDirectory(token);
      onSuccess(updatedUser);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to deactivate user account. Please verify network connectivity.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-amber-50/70 to-transparent dark:from-amber-950/20 dark:to-transparent border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Deactivate User Account
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Temporarily suspend account access and revoke active authentication sessions
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Target User Summary Card */}
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
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Ineligible Conditions */}
          {isUserDesignatedAdmin && (
            <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/80 dark:bg-purple-950/30 flex items-start gap-2.5 text-xs text-purple-700 dark:text-purple-300">
              <Lock className="h-4 w-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
              <div>
                <strong>Designated System Administrator Protected:</strong> This account represents the primary platform owner and cannot be deactivated.
              </div>
            </div>
          )}

          {isSelf && !isUserDesignatedAdmin && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>Self-Deactivation Prohibited:</strong> Administrators cannot deactivate their own active account.
              </div>
            </div>
          )}

          {hasOwnedProjects && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <strong>Project Ownership Transfer Required:</strong>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  This user currently owns <strong>{ownedProjects.length}</strong> active project(s):{' '}
                  <span className="font-semibold">{ownedProjects.map((p) => p.name).join(', ')}</span>.
                  You must transfer project ownership to another team member before deactivation.
                </p>
              </div>
            </div>
          )}

          {/* Explanatory Policy Checklist */}
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/20 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3 w-3 text-slate-400" />
              Deactivation Policy & Data Retention
            </span>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Immediate session termination:</strong> The user will be banned in auth identity provider, revoking all refresh tokens.
              </li>
              <li>
                <strong>Historical data preserved:</strong> Tasks, comments, reports, and security audit logs are retained with full integrity.
              </li>
              <li>
                <strong>Excluded from selectors:</strong> Inactive users will no longer appear in new project/task assignment dropdowns.
              </li>
              <li>
                <strong>Reversible:</strong> Any System Administrator can reactivate this account at any time.
              </li>
            </ul>
          </div>
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
            onClick={handleDeactivate}
            disabled={!canDeactivate || isSubmitting}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white border-amber-700 gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Confirm Deactivation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
