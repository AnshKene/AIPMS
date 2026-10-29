'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Task } from '@/lib/api/tasks';
import { Sprint } from '@/lib/api/sprints';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface DeliveryTrendChartProps {
  tasks?: Task[];
  sprints?: Sprint[];
}

// Function to generate smooth cubic bezier SVG path from coordinate points
function getSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const cpX = (current.x + next.x) / 2;
    path += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function DeliveryTrendChart({ tasks = [], sprints = [] }: DeliveryTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const trendData = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    const sprintMap = new Map<string, Sprint>();
    if (sprints && sprints.length > 0) {
      for (const s of sprints) {
        if (s && s.id) {
          sprintMap.set(s.id, s);
        }
      }
    }

    // Group tasks by scheduled milestone / delivery month
    const monthMap = new Map<string, { total: number; done: number; label: string }>();
    for (const t of tasks) {
      const sId = t.sprintId || (t as any).sprint_id;
      const sprint = sId ? sprintMap.get(sId) : null;
      const rawDate =
        t.dueDate ||
        (t as any).due_date ||
        t.startDate ||
        (t as any).start_date ||
        sprint?.endDate ||
        (sprint as any)?.end_date ||
        sprint?.startDate ||
        (sprint as any)?.start_date ||
        t.createdAt ||
        (t as any).created_at;

      if (!rawDate) continue;
      const date = new Date(rawDate);
      if (isNaN(date.getTime())) continue;

      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      if (!monthMap.has(key)) {
        monthMap.set(key, { total: 0, done: 0, label });
      }
      const entry = monthMap.get(key)!;
      entry.total += 1;
      if (t.status === 'DONE') entry.done += 1;
    }

    const sortedKeys = Array.from(monthMap.keys()).sort();
    if (sortedKeys.length === 0) {
      return null;
    }

    // If only 1 milestone month exists, construct a rolling 5-month trajectory to display progress
    if (sortedKeys.length === 1) {
      const singleKey = sortedKeys[0];
      const [yearStr, monthStr] = singleKey.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;

      const paddedData: { month: string; rate: number; total: number; done: number }[] = [];
      for (let offset = 4; offset >= 1; offset--) {
        const d = new Date(y, m - offset, 1);
        const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        paddedData.push({ month: label, rate: 0, total: 0, done: 0 });
      }

      const activeEntry = monthMap.get(singleKey)!;
      const activeRate = activeEntry.total > 0 ? Math.round((activeEntry.done / activeEntry.total) * 100) : 0;
      paddedData.push({
        month: activeEntry.label,
        rate: activeRate,
        total: activeEntry.total,
        done: activeEntry.done,
      });

      return paddedData;
    }

    const selectedKeys = sortedKeys.length <= 7 ? sortedKeys : sortedKeys.slice(0, 7);

    return selectedKeys.map((k) => {
      const { total, done, label } = monthMap.get(k)!;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      return { month: label, rate, total, done };
    });
  }, [tasks, sprints]);

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Project Delivery Trend</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Task completion rate over time
            </p>
          </div>
        </div>
        {trendData && trendData.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Velocity Track</span>
          </div>
        )}
      </div>

      {trendData && trendData.length >= 2 ? (
        <div className="relative mt-4 h-56 w-full">
          {/* Tooltip display */}
          {hoveredIdx !== null && trendData[hoveredIdx] && (
            <div className="absolute top-1 right-2 z-10 bg-slate-900/95 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-slate-700/60 pointer-events-none transition-all flex items-center gap-2">
              <span className="font-bold text-blue-300">{trendData[hoveredIdx].month}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold">{trendData[hoveredIdx].rate}% completed</span>
              <span className="text-slate-400">
                ({trendData[hoveredIdx].done}/{trendData[hoveredIdx].total} tasks)
              </span>
            </div>
          )}

          <svg className="h-full w-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="deliveryTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#2563eb" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* Grid Guidelines */}
            <line
              x1="40"
              y1="20"
              x2="480"
              y2="20"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="40"
              y1="85"
              x2="480"
              y2="85"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="40"
              y1="150"
              x2="480"
              y2="150"
              stroke="#e2e8f0"
              className="dark:stroke-slate-700"
              strokeWidth="1"
            />

            {/* Y-Axis Labels */}
            <text x="32" y="24" textAnchor="end" className="text-[10px] fill-slate-400 font-semibold">100%</text>
            <text x="32" y="89" textAnchor="end" className="text-[10px] fill-slate-400 font-semibold">50%</text>
            <text x="32" y="154" textAnchor="end" className="text-[10px] fill-slate-400 font-semibold">0%</text>

            {/* Render Smooth Spline Curve */}
            {(() => {
              const count = trendData.length;
              const points = trendData.map((d, idx) => {
                const x = 55 + idx * (410 / Math.max(1, count - 1));
                const y = 150 - (d.rate / 100) * 130;
                return { x, y };
              });

              const splinePath = getSmoothCurvePath(points);
              const lastPoint = points[points.length - 1];
              const firstPoint = points[0];
              const areaPath = `${splinePath} L ${lastPoint.x} 150 L ${firstPoint.x} 150 Z`;

              return (
                <>
                  {/* Gradient Area Fill */}
                  <path d={areaPath} fill="url(#deliveryTrendGradient)" />

                  {/* Active Hover Crosshair Guideline */}
                  {hoveredIdx !== null && points[hoveredIdx] && (
                    <line
                      x1={points[hoveredIdx].x}
                      y1="20"
                      x2={points[hoveredIdx].x}
                      y2="150"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      className="opacity-70"
                    />
                  )}

                  {/* Bezier Stroke Curve */}
                  <path
                    d={splinePath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />

                  {/* Data Points and Interaction Hitboxes */}
                  {points.map((p, idx) => {
                    const d = trendData[idx];
                    const isHovered = hoveredIdx === idx;
                    return (
                      <g
                        key={d.month}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        className="cursor-pointer"
                      >
                        {/* Invisible broader hit area for easy hover targeting */}
                        <rect
                          x={p.x - 18}
                          y="10"
                          width="36"
                          height="150"
                          fill="transparent"
                        />

                        {/* Outer halo on hover */}
                        {isHovered && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={10}
                            fill="#2563eb"
                            fillOpacity="0.2"
                            className="animate-ping"
                          />
                        )}

                        {/* Point node */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 2}
                          className="transition-all duration-200"
                        />

                        {/* X-Axis Month Label */}
                        <text
                          x={p.x}
                          y="170"
                          textAnchor="middle"
                          className={`text-[11px] font-semibold transition-colors ${
                            isHovered
                              ? 'fill-blue-600 dark:fill-blue-400 font-bold scale-110'
                              : 'fill-slate-400 dark:fill-slate-500'
                          }`}
                        >
                          {d.month}
                        </text>
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No task activity recorded yet
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Schedule tasks or link them to project sprints to automatically track delivery velocity over time.
          </p>
        </div>
      )}
    </Card>
  );
}
