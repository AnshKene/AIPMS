'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Server,
  ShieldCheck,
  Activity,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, ServiceHealthItem, SystemHealthResponse } from '@/lib/api/admin';
import { useAuth } from '@/lib/auth/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SystemHealthPage() {
  const { user } = useAuth();
  const [data, setData] = React.useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedService, setSelectedService] = React.useState<ServiceHealthItem | null>(null);

  const fetchHealth = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await adminApi.getSystemHealth();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve system health checks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminApi.getSystemHealth();
        if (!ignore) setData(res);
      } catch (err) {
        if (!ignore)
          setError(err instanceof Error ? err.message : 'Failed to retrieve system health checks');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

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
          Viewing system microservices health requires the <strong className="font-semibold text-slate-700 dark:text-slate-300">ADMIN</strong> role.
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
        title="System Health & Microservices"
        description="Real-time operational status, latency measurements, and health diagnostics across all backend REST microservices."
        breadcrumbs={[
          { label: 'Administration', href: '/admin/overview' },
          { label: 'System Health' },
        ]}
        onRefresh={() => fetchHealth(true)}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        accentColor="bg-emerald-600 dark:bg-emerald-400"
      />

      {/* Error alert */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Failed to perform health check
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHealth()}
              className="shrink-0 text-xs border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Cluster</span>
          <div className="pt-0.5">
            <AdminStatusBadge status={data?.status || 'HEALTHY'} />
          </div>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Healthy Services</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {data?.summary.healthy ?? 0} <span className="text-xs font-normal text-slate-400">/ {data?.summary.total ?? 9}</span>
          </div>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Degraded Services</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {data?.summary.degraded ?? 0}
          </div>
        </Card>

        <Card className="p-4 space-y-1 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offline Services</span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {data?.summary.offline ?? 0}
          </div>
        </Card>
      </div>

      {/* Microservice Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            <span>Monitored Microservices ({data?.services?.length || 9})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Last pinged: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Just now'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.services.map((item) => (
              <Card
                key={item.service}
                className="p-4 space-y-3 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      {item.service}
                    </p>
                  </div>
                  <AdminStatusBadge status={item.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Latency</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.latencyMs} ms
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Endpoint</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate block">
                      {item.url}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedService(item)}
                  className="w-full text-xs gap-1.5 mt-1 border-slate-200 dark:border-slate-800"
                >
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Inspect Diagnostic JSON</span>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Safe Diagnostic JSON Dialog */}
      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Service Diagnostic Output
            </DialogTitle>
            <DialogDescription className="text-xs">
              Safe, non-sensitive diagnostic parameters for {selectedService?.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    {selectedService.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{selectedService.url}</span>
                </div>
                <AdminStatusBadge status={selectedService.status} />
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Response Payload</span>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedService.details || { status: selectedService.status }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
