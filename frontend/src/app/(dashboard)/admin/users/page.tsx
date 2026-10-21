'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient, ApiError } from '@/lib/api/client';
import {
  type Role,
  isDesignatedAdmin,
  DESIGNATED_ADMIN_EMAIL,
} from '@/lib/auth/auth-storage';
import {
  Users,
  ShieldCheck,
  User,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SystemUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt?: string;
}

const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  ADMIN: {
    label: 'ADMIN',
    description: `Designated System Administrator (${DESIGNATED_ADMIN_EMAIL}): Global platform administration, user management, system health, and audit access.`,
  },
  PROJECT_MANAGER: {
    label: 'PROJECT MANAGER',
    description: 'Manage authorized project workflows, tasks, sprints, risks, and report analytics.',
  },
  TEAM_MEMBER: {
    label: 'TEAM MEMBER',
    description: 'Participate in permitted project execution, task updates, and sprint items.',
  },
  VIEWER: {
    label: 'VIEWER',
    description: 'Read-only access to authorized projects, dashboards, and reporting metrics.',
  },
};

export default function UsersAdminPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}

function UsersManagementContent() {
  const { token, user: currentUser, switchRole } = useAuth();
  const [users, setUsers] = React.useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');

  // Confirmation Modal state
  const [pendingRoleChange, setPendingRoleChange] = React.useState<{
    user: SystemUser;
    newRole: Role;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchUsers = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await apiClient.get<SystemUser[]>('auth/users', { token });
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to connect to authentication microservice. Please retry.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<SystemUser[]>('auth/users', { token });
        if (!ignore) setUsers(data);
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Failed to connect to authentication microservice. Please retry.',
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [token]);

  const handleInitiateRoleChange = (user: SystemUser, newRole: Role) => {
    if (user.role === newRole) return;
    if (isDesignatedAdmin(user)) {
      setError('The designated System Administrator account cannot be modified or demoted.');
      return;
    }
    if (newRole === 'ADMIN') {
      setError('The ADMIN role is exclusively reserved for the designated System Administrator.');
      return;
    }
    setPendingRoleChange({ user, newRole });
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    const { user, newRole } = pendingRoleChange;

    if (isDesignatedAdmin(user)) {
      setError('Action Denied: The designated System Administrator account cannot be modified or demoted.');
      setPendingRoleChange(null);
      return;
    }

    if (newRole === 'ADMIN') {
      setError('Action Denied: Role ADMIN cannot be assigned. Only the designated System Administrator is permitted.');
      setPendingRoleChange(null);
      return;
    }

    setIsSubmitting(true);
    setUpdatingId(user.id);
    setError(null);

    const previousRole = user.role;

    try {
      const updatedUser = await apiClient.patch<SystemUser>(
        `auth/users/${user.id}/role`,
        { role: newRole },
        { token },
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: updatedUser.role } : u)),
      );

      if (currentUser && currentUser.email.toLowerCase() === user.email.toLowerCase()) {
        switchRole(newRole);
      }

      setSuccessMessage(
        `Role for ${user.name || user.email} successfully updated to ${ROLE_INFO[newRole].label}.`,
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      setPendingRoleChange(null);
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: previousRole } : u)),
      );

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Role update request failed. Persisted role has been restored.');
      }
    } finally {
      setIsSubmitting(false);
      setUpdatingId(null);
    }
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const isSelfChange =
    pendingRoleChange &&
    currentUser &&
    currentUser.email.toLowerCase() === pendingRoleChange.user.email.toLowerCase();

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <AdminPageHeader
        title="Users & Access Management"
        description="View registered workspace accounts, inspect platform permissions, and manage authoritative administrator and team roles."
        breadcrumbs={[
          { label: 'Administration', href: '/admin/overview' },
          { label: 'Users & Access' },
        ]}
        onRefresh={() => fetchUsers(true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-purple-600 dark:bg-purple-400"
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex-1">
              {successMessage}
            </p>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Action Error
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers()}
              className="shrink-0 text-xs border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by user name or email address..."
        selectFilter={{
          value: roleFilter,
          onChange: setRoleFilter,
          options: [
            { label: 'All Roles', value: 'ALL' },
            { label: 'ADMIN', value: 'ADMIN' },
            { label: 'PROJECT MANAGER', value: 'PROJECT_MANAGER' },
            { label: 'TEAM MEMBER', value: 'TEAM_MEMBER' },
            { label: 'VIEWER', value: 'VIEWER' },
          ],
        }}
        totalCount={users.length}
        filteredCount={filteredUsers.length}
        onReset={() => {
          setSearchQuery('');
          setRoleFilter('ALL');
        }}
      />

      {/* Role Descriptions Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(ROLE_INFO) as Role[]).map((r) => {
          const count = users.filter((u) => u.role === r).length;
          return (
            <Card
              key={r}
              className="p-3.5 space-y-2 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between">
                <AdminStatusBadge status={r} />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {count} {count === 1 ? 'user' : 'users'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {ROLE_INFO[r].description}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Users Data Section */}
      <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Registered System Accounts
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {filteredUsers.length} matching records
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <User className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No users match your criteria
            </p>
            <p className="text-xs text-slate-400">
              Try clearing search terms or selecting another role filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">User Profile</th>
                    <th className="py-3 px-3">Email Address</th>
                    <th className="py-3 px-3">Current Role</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((u) => {
                    const isUpdating = updatingId === u.id;
                    const isCurrentUser =
                      currentUser && currentUser.email.toLowerCase() === u.email.toLowerCase();
                    const isUserDesignatedAdmin = isDesignatedAdmin(u);

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs shrink-0">
                              {(u.name || u.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{u.name || 'Unnamed User'}</span>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    You
                                  </span>
                                )}
                                {isUserDesignatedAdmin && (
                                  <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    <ShieldCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                    Designated Admin
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${u.email}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                              title={`Send email to ${u.email}`}
                            >
                              {u.email}
                            </a>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <AdminStatusBadge status={u.role} />
                        </td>

                        <td className="py-3 px-3">
                          {isUserDesignatedAdmin ? (
                            <div className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-xs font-semibold">
                              <Lock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <span>System Admin (Protected)</span>
                            </div>
                          ) : (
                            <select
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleInitiateRoleChange(u, e.target.value as Role)
                              }
                              className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                            >
                              <option value="PROJECT_MANAGER">PROJECT MANAGER</option>
                              <option value="TEAM_MEMBER">TEAM MEMBER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isUpdating ? (
                            <div className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-xs">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : isUserDesignatedAdmin ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                              System Owner
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Active
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout (< 640px) */}
            <div className="sm:hidden space-y-3">
              {filteredUsers.map((u) => {
                const isUpdating = updatingId === u.id;
                const isCurrentUser =
                  currentUser && currentUser.email.toLowerCase() === u.email.toLowerCase();
                const isUserDesignatedAdmin = isDesignatedAdmin(u);

                return (
                  <Card key={u.id} className="p-4 space-y-3 border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 text-xs font-bold">
                          {(u.name || u.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {u.name || 'Unnamed User'}
                            </h4>
                            {isUserDesignatedAdmin && (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                                Designated Admin
                              </Badge>
                            )}
                          </div>
                          <a
                            href={`mailto:${u.email}`}
                            className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors block truncate"
                            title={`Send email to ${u.email}`}
                          >
                            {u.email}
                          </a>
                        </div>
                      </div>
                      {isCurrentUser && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <AdminStatusBadge status={u.role} />

                      {isUserDesignatedAdmin ? (
                        <div className="inline-flex items-center gap-1.5 h-8 px-2 rounded-md border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-xs font-semibold">
                          <Lock className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>Protected Admin</span>
                        </div>
                      ) : (
                        <select
                          value={u.role}
                          disabled={isUpdating}
                          onChange={(e) =>
                            handleInitiateRoleChange(u, e.target.value as Role)
                          }
                          className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                        >
                          <option value="PROJECT_MANAGER">PROJECT MANAGER</option>
                          <option value="TEAM_MEMBER">TEAM MEMBER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Confirmation Dialog Modal */}
      <Dialog open={!!pendingRoleChange} onOpenChange={(open) => !open && setPendingRoleChange(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Confirm Privilege & Role Modification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review permission changes before applying role updates to the backend.
            </DialogDescription>
          </DialogHeader>

          {pendingRoleChange && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target User</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {pendingRoleChange.user.name || pendingRoleChange.user.email}
                </p>
                <a
                  href={`mailto:${pendingRoleChange.user.email}`}
                  className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline font-mono text-[11px] block transition-colors"
                  title={`Send email to ${pendingRoleChange.user.email}`}
                >
                  {pendingRoleChange.user.email}
                </a>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Role</span>
                  <div>
                    <AdminStatusBadge status={pendingRoleChange.user.role} />
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Proposed Role</span>
                  <div>
                    <AdminStatusBadge status={pendingRoleChange.newRole} />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 space-y-1">
                <span className="font-bold block">Permission Impact</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug">
                  {ROLE_INFO[pendingRoleChange.newRole].description}
                </p>
              </div>

              {isSelfChange && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Active Session Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                    You are modifying your own active administrative account role. Your platform access rights will take effect immediately upon server confirmation.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingRoleChange(null)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRoleChange}
              disabled={isSubmitting || (pendingRoleChange ? isDesignatedAdmin(pendingRoleChange.user) || pendingRoleChange.newRole === 'ADMIN' : false)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving to Server...</span>
                </>
              ) : (
                <span>Confirm Role Change</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
