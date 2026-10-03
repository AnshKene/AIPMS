'use client';

import * as React from 'react';
import { type Risk, type RiskProbability, type RiskImpact } from '@/lib/api/risks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

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
        ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400'
        : 'bg-rose-100/90 text-rose-900 border-rose-300 hover:bg-rose-200';
    }
    if (score >= 3) {
      return isSelected
        ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400'
        : 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200';
    }
    return isSelected
      ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-400'
      : 'bg-emerald-100/90 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              3×3 Probability & Impact Risk Matrix
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click any matrix cell to filter project risks by probability and impact.
            </CardDescription>
          </div>
          {(selectedProbability || selectedImpact) && (
            <button
              onClick={() => onSelectCell?.(undefined, undefined)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Clear cell filter
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[340px] max-w-lg mx-auto">
            {/* Column Headers (Impact) */}
            <div className="grid grid-cols-[80px_repeat(3,1fr)] gap-2 mb-2 text-center text-xs font-semibold text-slate-600">
              <div></div>
              <div>Low Impact</div>
              <div>Med Impact</div>
              <div>High Impact</div>
            </div>

            {/* Matrix Rows (Probability) */}
            {PROBABILITIES.map((p) => (
              <div key={p} className="grid grid-cols-[80px_repeat(3,1fr)] gap-2 mb-2 items-center">
                {/* Row Header */}
                <div className="text-xs font-semibold text-slate-600 text-right pr-2">
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
                      onClick={() => {
                        if (isSelected) {
                          onSelectCell?.(undefined, undefined);
                        } else {
                          onSelectCell?.(p, i);
                        }
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg border transition-all cursor-pointer text-center',
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
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-300 border border-emerald-400 inline-block" />
                <span>Low Risk (1-2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-300 border border-amber-400 inline-block" />
                <span>Moderate Risk (3-4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-300 border border-rose-400 inline-block" />
                <span>Critical Risk (6-9)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
