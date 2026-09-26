import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Server, Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Projects Management
              </h2>
              <Badge variant="info">Project Service</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Manage project ownership, status lifecycles, and high-level project metadata.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button disabled size="sm" className="gap-1.5 opacity-60">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Foundation Card */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Project Service UI Foundation
              </CardTitle>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-mono text-[10px]">
                API Gateway /api/projects
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Backend Microservice: Project Service on PORT 3002
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
              <Server className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">
                Projects Module Foundation Ready
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This module connects via the API Gateway to Project Service (:3002). Full CRUD capabilities for project creation, details, and status filtering will be enabled in the upcoming feature milestone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
