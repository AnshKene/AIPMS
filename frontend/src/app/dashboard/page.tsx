import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban,
  CheckSquare,
  Zap,
  AlertTriangle,
  Sparkles,
  Server,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const statCards = [
    {
      title: 'Total Projects',
      value: '--',
      subtitle: 'No active projects yet',
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-100',
      href: '/projects',
    },
    {
      title: 'Total Tasks',
      value: '--',
      subtitle: 'No tasks configured',
      icon: CheckSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
      href: '/tasks',
    },
    {
      title: 'Active Sprints',
      value: '--',
      subtitle: 'No planned sprints',
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-100',
      href: '/sprints',
    },
    {
      title: 'Open Risks',
      value: '--',
      subtitle: 'No identified risks',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-100',
      href: '/risks',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                AIPMS Executive Overview
              </h2>
              <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider">
                Foundation v1.0
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Welcome to the AI-Based Project Management System dashboard foundation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-emerald-200 bg-emerald-50/50 text-emerald-800 font-medium">
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              API Gateway Connected (:3000)
            </Badge>
          </div>
        </div>

        {/* Overview Stat Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href} className="block group">
                <Card className="transition-all duration-200 hover:shadow-md hover:border-slate-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg border ${card.bgColor}`}>
                      <Icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-extrabold text-slate-900">
                        {card.value}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {card.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Secondary Dashboard Sections */}
        <div className="grid gap-6 md:grid-cols-7">
          {/* AI Project Insights Foundation Card */}
          <Card className="md:col-span-4 border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      AI System Analysis & Risk Radar
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Predictive project health analysis powered by microservices
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                  Ready for Integration
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-2">
                <Clock className="h-8 w-8 text-slate-400 mx-auto mb-1" />
                <h4 className="text-sm font-semibold text-slate-700">
                  AI Analytics Foundation Active
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Once project records and task dependencies are created, the AI engine evaluates project bottleneck vectors, sprint velocity, and probability-impact risk scores.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-3 rounded-md bg-slate-100/70 border border-slate-200/60">
                  <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Task Service</div>
                    <div className="text-[10px] text-slate-500">Port 3004 • Dependencies</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-md bg-slate-100/70 border border-slate-200/60">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">Risk Matrix</div>
                    <div className="text-[10px] text-slate-500">Port 3006 • Impact Score</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick System Links Card */}
          <Card className="md:col-span-3 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">
                AIPMS Platform Modules
              </CardTitle>
              <CardDescription className="text-xs">
                Core domain services integrated via API Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { name: 'Projects Module', href: '/projects', desc: 'Project ownership & metadata', port: '3002' },
                { name: 'Teams Module', href: '/teams', desc: 'Team membership & allocation', port: '3003' },
                { name: 'Tasks & Dependencies', href: '/tasks', desc: 'Task hierarchy & DAG', port: '3004' },
                { name: 'Sprints Engine', href: '/sprints', desc: 'Agile sprint iteration cycles', port: '3005' },
                { name: 'Risk Management', href: '/risks', desc: 'Probability & score calculator', port: '3006' },
                { name: 'Reporting Service', href: '/reports', desc: 'Aggregated project metrics', port: '3007' },
              ].map((mod) => (
                <Link
                  key={mod.name}
                  href={mod.href}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">{mod.name}</span>
                    <span className="text-[10px] text-slate-500">{mod.desc}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px] text-slate-600">
                    :{mod.port}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
