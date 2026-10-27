'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient, ApiError } from '@/lib/api/client';
import {
  isDesignatedAdmin,
} from '@/lib/auth/auth-storage';
import { userDirectory } from '@/lib/auth/user-directory';
import { authApi } from '@/lib/api/auth';
import {
  User,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Lock,
  Settings2,
  UserX,
  UserCheck,
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RoleBadge } from '@/components/common/RoleBadge';
import { UserRoleDialog, type SystemUser } from '@/components/admin/UserRoleDialog';
import { DeactivateUserDialog } from '@/components/admin/DeactivateUserDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { listProjects, type Project } from '@/lib/api/projects';

export default function UsersAdminPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <UsersManagementContent />
    </ProtectedRoute>
  );
}

function UsersManagementContent() {
  const { token, user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = React.useState<SystemUser[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortField, setSortField] = React.useState<'name' | 'email' | 'role' | 'status' | 'created'>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Modal dialog states
  const [selectedUserForRole, setSelectedUserForRole] = React.useState<SystemUser | null>(null);
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = React.useState<SystemUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = React.useState<SystemUser | null>(null);
  const [reactivatingUserId, setReactivatingUserId] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [usersData, projectsData] = await Promise.allSettled([
          apiClient.get<SystemUser[]>('auth/users', { token }),
          listProjects({ limit: 100 }),
        ]);

        if (usersData.status === 'fulfilled') {
          const list = usersData.value || [];
          setUsers(list);
          userDirectory.setAuthoritativeUsers(list);
        } else {
          throw usersData.reason;
        }

        if (projectsData.status === 'fulfilled') {
          setProjects(projectsData.value.data || []);
        }
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
    },
    [token],
  );

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [usersData, projectsData] = await Promise.allSettled([
          apiClient.get<SystemUser[]>('auth/users', { token }),
          listProjects({ limit: 100 }),
        ]);

        if (!ignore && usersData.status === 'fulfilled') {
          const list = usersData.value || [];
          setUsers(list);
          userDirectory.setAuthoritativeUsers(list);
        }
        if (!ignore && projectsData.status === 'fulfilled') {
          setProjects(projectsData.value.data || []);
        }
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

  // Handlers for role update
  const handleRoleUpdateSuccess = (updatedUser: SystemUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? { ...u, role: updatedUser.role } : u)),
    );
    userDirectory.updateUser({ id: updatedUser.id, role: updatedUser.role });
    void userDirectory.fetchDirectory(token);

    if (currentUser && currentUser.email.toLowerCase() === updatedUser.email.toLowerCase()) {
      void refreshUser();
    }

    setSuccessMessage(
      `Role for ${updatedUser.name || updatedUser.email} successfully updated to ${updatedUser.role}.`,
    );
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Handler for reactivation
  const handleReactivate = async (targetUser: SystemUser) => {
    setReactivatingUserId(targetUser.id);
    setError(null);

    try {
      await authApi.reactivateUser(targetUser.id, token);
      const updatedUser: SystemUser = {
        ...targetUser,
        status: 'ACTIVE',
        deactivatedAt: null,
      };
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updatedUser : u)));
      userDirectory.updateUser(updatedUser);
      void userDirectory.fetchDirectory(token);
      setSuccessMessage(`Account for ${targetUser.name || targetUser.email} has been reactivated successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reactivate account. Please verify network connectivity.');
      }
    } finally {
      setReactivatingUserId(null);
    }
  };

  // Handler for deactivation success
  const handleDeactivateSuccess = (updatedUser: SystemUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    userDirectory.updateUser(updatedUser);
    void userDirectory.fetchDirectory(token);
    setSuccessMessage(`Account for ${updatedUser.name || updatedUser.email} has been deactivated.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Handler for permanent deletion success
  const handleDeleteSuccess = (deletedUserId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== deletedUserId));
    userDirectory.removeUser(deletedUserId);
    void userDirectory.fetchDirectory(token);
    setSuccessMessage('User account and identities permanently deleted successfully.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Toggle sort field or direction
  const handleSort = (field: 'name' | 'email' | 'role' | 'status' | 'created') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedUsers = React.useMemo(() => {
    const filtered = users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const userStatus = u.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const matchesStatus = statusFilter === 'ALL' || userStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.name || a.email).localeCompare(b.name || b.email);
      } else if (sortField === 'email') {
        comparison = a.email.localeCompare(b.email);
      } else if (sortField === 'role') {
        comparison = a.role.localeCompare(b.role);
      } else if (sortField === 'status') {
        comparison = (a.status || 'ACTIVE').localeCompare(b.status || 'ACTIVE');
      } else if (sortField === 'created') {
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  // Count projects owned by user
  const getUserOwnedProjects = (userId: string) => {
    return projects.filter((p) => p.ownerId === userId);
  };

  const activeCount = users.filter((u) => u.status !== 'INACTIVE').length;
  const inactiveCount = users.filter((u) => u.status === 'INACTIVE').length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <AdminPageHeader
        title="User & Lifecycle Governance"
        description="Inspect registered system accounts, manage RBAC privileges, enforce account deactivation, and execute permanent deletions with referential integrity."
        breadcrumbs={[
          { label: 'Administration', href: '/admin/overview' },
          { label: 'Users & Lifecycle' },
        ]}
        onRefresh={() => fetchUsers(true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-purple-600 dark:bg-purple-400"
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex-1">
              {successMessage}
            </p>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 p-3.5 rounded-xl">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Action Error
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers()}
              className="shrink-0 text-xs h-7 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Compact Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Total Accounts</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{users.length}</span>
        </div>
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Active Accounts</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </span>
        </div>
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Inactive / Suspended</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {inactiveCount}
          </span>
        </div>
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Admins</span>
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
            {users.filter((u) => u.role === 'ADMIN').length}
          </span>
        </div>
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Project Managers</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {users.filter((u) => u.role === 'PROJECT_MANAGER').length}
          </span>
        </div>
        <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Team Members</span>
          <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
            {users.filter((u) => u.role === 'TEAM_MEMBER').length}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Filter and Control Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8.5 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="h-8.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">All Statuses ({users.length})</option>
              <option value="ACTIVE">Active ({activeCount})</option>
              <option value="INACTIVE">Inactive / Suspended ({inactiveCount})</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">All Roles ({users.length})</option>
              <option value="ADMIN">ADMIN</option>
              <option value="PROJECT_OWNER">PROJECT OWNER</option>
              <option value="PROJECT_MANAGER">PROJECT MANAGER</option>
              <option value="TEAM_MEMBER">TEAM MEMBER</option>
              <option value="VIEWER">VIEWER</option>
            </select>

            {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="h-8.5 text-xs text-slate-500 hover:text-slate-900"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredAndSortedUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <User className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No matching users found
            </p>
            <p className="text-[11px] text-slate-400">
              Adjust search keywords or clear filters to see all accounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>User</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Email</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Global Role</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Workspaces Owned</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedUsers.map((u) => {
                  const isCurrentUser = Boolean(
                    currentUser && currentUser.email.toLowerCase() === u.email.toLowerCase(),
                  );
                  const isUserDesignatedAdmin = isDesignatedAdmin(u);
                  const userOwnedProjects = getUserOwnedProjects(u.id);
                  const isInactive = u.status === 'INACTIVE';
                  const isReactivating = reactivatingUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group ${
                        isInactive ? 'bg-slate-50/40 dark:bg-slate-900/20 opacity-80' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3">
                          <Avatar
                            fallback={userDirectory.getInitials(u.name || u.email)}
                            size="sm"
                            className="h-8 w-8 text-xs shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{u.name || 'Unnamed User'}</span>
                              {isCurrentUser && (
                                <span className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:text-blue-300">
                                  You
                                </span>
                              )}
                              {isUserDesignatedAdmin && (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Lock className="h-2.5 w-2.5" />
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 select-all block truncate max-w-[180px]">
                              {u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${u.email}`}
                            className="hover:text-purple-600 dark:hover:text-purple-400 hover:underline transition-colors truncate"
                          >
                            {u.email}
                          </a>
                        </div>
                      </td>

                      {/* Global Role */}
                      <td className="py-3 px-4">
                        <RoleBadge role={u.role} size="sm" />
                      </td>

                      {/* Workspaces Owned */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {userOwnedProjects.length > 0 ? (
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {userOwnedProjects.length} {userOwnedProjects.length === 1 ? 'project' : 'projects'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 projects</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3 px-4">
                        {isUserDesignatedAdmin ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800 font-semibold gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            System Owner
                          </Badge>
                        ) : isInactive ? (
                          <div className="space-y-0.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50/60 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-semibold gap-1"
                            >
                              <Clock className="h-3 w-3" />
                              Inactive
                            </Badge>
                            {u.deactivatedAt && (
                              <span className="block text-[9px] text-slate-400">
                                {new Date(u.deactivatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isUserDesignatedAdmin ? (
                          <span className="text-[11px] text-slate-400 italic font-medium">Protected System Admin</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Manage Role */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserForRole(u)}
                              className="h-7 text-xs gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-700"
                            >
                              <Settings2 className="h-3 w-3" />
                              Role
                            </Button>

                            {/* Inactive user actions: Reactivate & Delete */}
                            {isInactive ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivate(u)}
                                  disabled={isReactivating}
                                  className="h-7 text-xs gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                >
                                  {isReactivating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3 w-3" />
                                  )}
                                  Reactivate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUserForDelete(u)}
                                  className="h-7 text-xs gap-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-300"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </>
                            ) : (
                              /* Active user actions: Deactivate */
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserForDeactivate(u)}
                                disabled={isCurrentUser}
                                title={isCurrentUser ? 'Cannot deactivate your own active account' : 'Deactivate user account'}
                                className="h-7 text-xs gap-1 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:border-amber-300 disabled:opacity-40"
                              >
                                <UserX className="h-3 w-3" />
                                Deactivate
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredAndSortedUsers.length} of {users.length} accounts</span>
          <span className="text-[11px]">Backend RLS, Session Revocation & Multi-tier Lifecycle Enforced</span>
        </div>
      </Card>

      {/* Role Management Dialog */}
      <UserRoleDialog
        user={selectedUserForRole}
        open={Boolean(selectedUserForRole)}
        onOpenChange={(open) => !open && setSelectedUserForRole(null)}
        onSuccess={handleRoleUpdateSuccess}
      />

      {/* Deactivate User Dialog */}
      <DeactivateUserDialog
        user={selectedUserForDeactivate}
        ownedProjects={selectedUserForDeactivate ? getUserOwnedProjects(selectedUserForDeactivate.id) : []}
        open={Boolean(selectedUserForDeactivate)}
        onOpenChange={(open) => !open && setSelectedUserForDeactivate(null)}
        onSuccess={handleDeactivateSuccess}
      />

      {/* Permanently Delete User Dialog */}
      <DeleteUserDialog
        user={selectedUserForDelete}
        ownedProjects={selectedUserForDelete ? getUserOwnedProjects(selectedUserForDelete.id) : []}
        open={Boolean(selectedUserForDelete)}
        onOpenChange={(open) => !open && setSelectedUserForDelete(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
