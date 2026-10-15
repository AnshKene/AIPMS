'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  User,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, AuditLogItem } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Selected audit record for detail modal
  const [selectedRecord, setSelectedRecord] = React.useState<AuditLogItem | null>(null);

  const fetchLogs = React.useCallback(
    async (targetPage = page, isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await adminApi.getAuditLogs({
          page: targetPage,
          limit,
          search: search.trim() || undefined,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
        });

        setLogs(res.items || []);
        setTotal(res.meta?.total || 0);
        setTotalPages(res.meta?.totalPages || 1);
        setPage(res.meta?.page || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, search, actionFilter],
  );

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminApi.getAuditLogs({
          page: 1,
          limit,
          search: search.trim() || undefined,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
        });
        if (!ignore) {
          setLogs(res.items || []);
          setTotal(res.meta?.total || 0);
          setTotalPages(res.meta?.totalPages || 1);
          setPage(res.meta?.page || 1);
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [actionFilter, limit, search]);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Access Restricted
        </h1>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          Viewing security audit logs requires the <strong className="font-semibold text-slate-700 dark:text-slate-300">ADMIN</strong> role.
        </p>
        <Link href="/dashboard">
          <Button className="mt-2">Return to Workspace Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <AdminPageHeader
        title="Security & Audit Logs"
        description="Durable, server-recorded security events, role modifications, authorization checks, and access attempts."
        breadcrumbs={[
          { label: 'Administration', href: '/admin/overview' },
          { label: 'Audit Logs' },
        ]}
        onRefresh={() => fetchLogs(page, true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-purple-600 dark:bg-purple-400"
      />

      {/* Error alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Failed to load audit records
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page)}
              className="shrink-0 text-xs border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Controls: Search & Filters */}
      <AdminFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by actor email, action type, or target resource..."
        selectFilter={{
          value: actionFilter,
          onChange: setActionFilter,
          options: [
            { label: 'All Event Types', value: 'ALL' },
            { label: 'ROLE_ASSIGNED', value: 'ROLE_ASSIGNED' },
            { label: 'UNAUTHORIZED_ACCESS_ATTEMPT', value: 'UNAUTHORIZED_ACCESS_ATTEMPT' },
            { label: 'SYSTEM_HEALTH_CHECK', value: 'SYSTEM_HEALTH_CHECK' },
            { label: 'USER_LOGIN', value: 'USER_LOGIN' },
          ],
        }}
        totalCount={total}
        filteredCount={logs.length}
        onReset={() => {
          setSearch('');
          setActionFilter('ALL');
        }}
      />

      {/* Audit Log Table */}
      <Card className="p-5 space-y-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Audit Stream ({total} total records)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {totalPages}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No audit records match your search or filter
            </p>
            <p className="text-xs text-slate-400">
              Try clearing filters or adjusting your search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Action Type</th>
                  <th className="py-3 px-3">Target Resource</th>
                  <th className="py-3 px-3">Transition (Prev → New)</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3 text-right">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(record.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{record.actorEmail || record.actorId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 dark:bg-slate-800">
                        {record.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {record.targetResource || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {record.previousValue || record.newValue ? (
                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          {record.previousValue || 'none'} → <strong className="text-purple-600 dark:text-purple-400">{record.newValue || 'none'}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <AdminStatusBadge status={record.outcome} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(record)}
                        className="h-7 px-2 text-xs gap-1 text-slate-600 dark:text-slate-300 hover:text-purple-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
          <span className="text-slate-500">
            Showing {logs.length} of {total} events
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || isLoading}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="h-8 text-xs gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Inspect Context Dialog Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Audit Log Detail Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sanitized event metadata recorded on the server.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Event ID</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedRecord.id}</span>
                </div>
                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Action</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{selectedRecord.action}</span>
                </div>
                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Actor</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRecord.actorEmail || selectedRecord.actorId}</span>
                </div>
                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Timestamp</span>
                  <span className="text-slate-800 dark:text-slate-200">{new Date(selectedRecord.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Context & Payload (Sanitized)
                </span>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(selectedRecord.context || { note: 'No additional context' }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
