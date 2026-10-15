'use client';

import * as React from 'react';
import { type Risk, type RiskProbability, type RiskImpact } from '@/lib/api/risks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface RiskMatrixProps {
  risks: Risk[];
  selectedProbability?: RiskProbability;
  selectedImpact?: RiskImpact;
  onSelectCell?: (probability?: RiskProbability, impact?: RiskImpact) => void;
}

const PROBABILITIES: RiskProbability[] = ['HIGH', 'MEDIUM', 'LOW'];
const IMPACTS: RiskImpact[] = ['LOW', 'MEDIUM', 'HIGH'];

export function RiskMatrix({
  risks,
  selectedProbability,
  selectedImpact,
  onSelectCell,
}: RiskMatrixProps) {
  // Count risks in each matrix cell
  const matrixCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PROBABILITIES) {
      for (const i of IMPACTS) {
        counts[`${p}_${i}`] = 0;
      }
    }
    for (const r of risks) {
      const key = `${r.probability}_${r.impact}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [risks]);

  function getScore(p: RiskProbability, i: RiskImpact): number {
    const pVal = p === 'HIGH' ? 3 : p === 'MEDIUM' ? 2 : 1;
    const iVal = i === 'HIGH' ? 3 : i === 'MEDIUM' ? 2 : 1;
    return pVal * iVal;
  }

  function getCellColor(score: number, isSelected: boolean): string {
    if (score >= 6) {
      return isSelected
        ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400 dark:bg-rose-600 dark:text-white'
        : 'bg-rose-100/90 text-rose-950 border-rose-300 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 dark:hover:bg-rose-900/60';
    }
    if (score >= 3) {
      return isSelected
        ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400 dark:bg-amber-600 dark:text-white'
        : 'bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-900/60';
    }
    return isSelected
      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 dark:bg-emerald-600 dark:text-white'
      : 'bg-emerald-100/90 text-emerald-950 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/60';
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              3×3 Probability &amp; Impact Risk Matrix
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Click any matrix cell to filter risks by probability (rows) and impact (columns).
            </CardDescription>
          </div>
          {(selectedProbability || selectedImpact) && (
            <button
              onClick={() => onSelectCell?.(undefined, undefined)}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Reset cell selection
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[340px] max-w-lg mx-auto">
            {/* Column Headers (Impact) */}
            <div className="grid grid-cols-[85px_repeat(3,1fr)] gap-2 mb-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div />
              <div>Low Impact</div>
              <div>Med Impact</div>
              <div>High Impact</div>
            </div>

            {/* Matrix Rows (Probability) */}
            {PROBABILITIES.map((p) => (
              <div key={p} className="grid grid-cols-[85px_repeat(3,1fr)] gap-2 mb-2 items-center">
                {/* Row Header */}
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right pr-2">
                  {p === 'HIGH' ? 'High Prob' : p === 'MEDIUM' ? 'Med Prob' : 'Low Prob'}
                </div>

                {/* Cells */}
                {IMPACTS.map((i) => {
                  const score = getScore(p, i);
                  const count = matrixCounts[`${p}_${i}`] ?? 0;
                  const isSelected = selectedProbability === p && selectedImpact === i;

                  return (
                    <button
                      key={`${p}_${i}`}
                      type="button"
                      aria-label={`Probability ${p}, Impact ${i}, Score ${score}, ${count} risks`}
                      onClick={() => {
                        if (isSelected) {
                          onSelectCell?.(undefined, undefined);
                        } else {
                          onSelectCell?.(p, i);
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg border transition-all cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        getCellColor(score, isSelected),
                      )}
                    >
                      <span className="text-xs font-bold font-mono">Score {score}</span>
                      <span className={cn('text-lg font-black', count > 0 ? 'scale-110' : 'opacity-60')}>
                        {count} {count === 1 ? 'risk' : 'risks'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-400 border border-emerald-500 inline-block" />
                <span>Low Risk (1-2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-400 border border-amber-500 inline-block" />
                <span>Moderate Risk (3-4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-500 border border-rose-600 inline-block" />
                <span>Critical Risk (6-9)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
