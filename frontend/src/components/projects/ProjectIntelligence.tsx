'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, AlertTriangle, CheckCircle2, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { aiApi, type AiAnalysisResponse } from '@/lib/api/ai';

interface ProjectIntelligenceProps {
  projectId: string;
  projectName?: string;
}

export function ProjectIntelligence({ projectId, projectName }: ProjectIntelligenceProps) {
  const [data, setData] = React.useState<AiAnalysisResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAnalysis = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.healthSummary(projectId);
      setData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (isMounted) {
        await fetchAnalysis();
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [fetchAnalysis]);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Project AI Intelligence</h2>
            <p className="text-[11px] text-slate-400">Evidence-grounded telemetry for {projectName || 'this project'}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchAnalysis()}
          disabled={loading}
          className="h-8 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Refresh AI Analysis"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-xs text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span>Analyzing project telemetry & risks...</span>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>AI Service: {error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void fetchAnalysis()} className="h-7 text-[11px]">
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-4 text-xs">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Health Score</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{data.healthScore ?? 100}/100</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Status</span>
              <Badge variant={data.healthStatus === 'CRITICAL' || data.healthStatus === 'AT_RISK' ? 'warning' : 'success'} className="text-[10px]">
                {data.healthStatus ?? 'HEALTHY'}
              </Badge>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Trajectory</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{data.deliveryTrajectory ?? 'ON_TRACK'}</span>
            </div>
          </div>

          {/* AI Narrative Summary */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Assessment Summary</span>
            </div>
            <p>{data.summary}</p>
          </div>

          {/* Action Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">Recommended Actions:</span>
              <div className="space-y-1.5">
                {data.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400">
          Not enough project telemetry for a reliable assessment.
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Grounded by Ollama AI</span>
        <span className="flex items-center gap-1 text-[#0052FF] dark:text-[#4D7CFF] font-semibold cursor-pointer">
          <span>Full Analysis</span>
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Card>
  );
}
