'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Zap,
  Users,
  BarChart3,
  Loader2,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { listProjects, type Project } from '@/lib/api/projects';
import { listTasks, type Task } from '@/lib/api/tasks';
import { listRisks, type Risk } from '@/lib/api/risks';
import { listSprints, type Sprint } from '@/lib/api/sprints';
import { listTeams, type Team } from '@/lib/api/teams';

export interface CommandSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SearchItem {
  id: string;
  type: 'project' | 'task' | 'sprint' | 'risk' | 'team' | 'shortcut';
  group: 'Quick Navigation' | 'Projects' | 'Tasks' | 'Sprints' | 'Risks' | 'Teams';
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const QUICK_SHORTCUTS: SearchItem[] = [
  {
    id: 'nav-projects',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Projects Workspace',
    subtitle: 'View all active & planned projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    id: 'nav-tasks',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Tasks Workspace',
    subtitle: 'View and manage all task assignments',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    id: 'nav-sprints',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Sprints Workspace',
    subtitle: 'Track sprint iterations and goals',
    href: '/sprints',
    icon: Zap,
  },
  {
    id: 'nav-teams',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Teams Workspace',
    subtitle: 'Manage teams and member responsibilities',
    href: '/teams',
    icon: Users,
  },
  {
    id: 'nav-risks',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Risks Management Matrix',
    subtitle: 'Evaluate 3×3 risk scores & mitigations',
    href: '/risks',
    icon: AlertTriangle,
  },
  {
    id: 'nav-reports',
    type: 'shortcut',
    group: 'Quick Navigation',
    title: 'Reports & Analytics',
    subtitle: 'Cross-project executive reports and export',
    href: '/reports',
    icon: BarChart3,
  },
];

export function CommandSearchModal({ open, onOpenChange }: CommandSearchModalProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [allDataItems, setAllDataItems] = React.useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setQuery('');
        setSelectedIndex(0);
        setError(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  // Load searchable records when modal opens
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [projRes, taskRes, sprintRes, riskRes, teamRes] = await Promise.allSettled([
          listProjects({ limit: 50 }),
          listTasks({ limit: 50 }),
          listSprints({ limit: 50 }),
          listRisks({ limit: 50 }),
          listTeams({ limit: 50 }),
        ]);

        if (!active) return;

        const items: SearchItem[] = [];

        // 1. Projects
        if (projRes.status === 'fulfilled') {
          const projs: Project[] = Array.isArray(projRes.value)
            ? projRes.value
            : projRes.value.data ?? [];
          projs.forEach((p) => {
            items.push({
              id: `proj-${p.id}`,
              type: 'project',
              group: 'Projects',
              title: p.name,
              subtitle: p.description ? p.description.slice(0, 70) : `Project ID: ${p.id.slice(0, 8)}...`,
              href: `/projects/${p.id}`,
              icon: FolderKanban,
              badgeText: p.status,
            });
          });
        }

        // 2. Tasks
        if (taskRes.status === 'fulfilled') {
          const tasks: Task[] = Array.isArray(taskRes.value)
            ? taskRes.value
            : taskRes.value.data ?? [];
          tasks.forEach((t) => {
            items.push({
              id: `task-${t.id}`,
              type: 'task',
              group: 'Tasks',
              title: t.title,
              subtitle: `Status: ${t.status} • Priority: ${t.priority}`,
              href: `/tasks?projectId=${t.projectId}`,
              icon: CheckSquare,
              badgeText: t.status,
            });
          });
        }

        // 3. Sprints
        if (sprintRes.status === 'fulfilled') {
          const sprints: Sprint[] = Array.isArray(sprintRes.value)
            ? sprintRes.value
            : [];
          sprints.forEach((s) => {
            items.push({
              id: `sprint-${s.id}`,
              type: 'sprint',
              group: 'Sprints',
              title: s.name,
              subtitle: s.goal ? `Goal: ${s.goal}` : `Status: ${s.status}`,
              href: `/sprints?projectId=${s.projectId}`,
              icon: Zap,
              badgeText: s.status,
            });
          });
        }

        // 4. Risks
        if (riskRes.status === 'fulfilled') {
          const risks: Risk[] = Array.isArray(riskRes.value)
            ? riskRes.value
            : [];
          risks.forEach((r) => {
            items.push({
              id: `risk-${r.id}`,
              type: 'risk',
              group: 'Risks',
              title: r.title,
              subtitle: `Score: ${r.riskScore} (${r.probability} Prob / ${r.impact} Impact)`,
              href: `/risks?projectId=${r.projectId}`,
              icon: AlertTriangle,
              badgeText: r.status,
            });
          });
        }

        // 5. Teams
        if (teamRes.status === 'fulfilled') {
          const teams: Team[] = Array.isArray(teamRes.value)
            ? teamRes.value
            : teamRes.value.data ?? [];
          teams.forEach((tm) => {
            items.push({
              id: `team-${tm.id}`,
              type: 'team',
              group: 'Teams',
              title: tm.name,
              subtitle: tm.description ? tm.description.slice(0, 70) : 'Project Engineering Team',
              href: `/teams/${tm.id}`,
              icon: Users,
            });
          });
        }

        setAllDataItems(items);
        setSelectedIndex(0);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to search records right now.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [open]);

  // Filter & group items based on query
  const displayedItems = React.useMemo(() => {
    if (!query.trim()) {
      return QUICK_SHORTCUTS;
    }

    const q = query.trim().toLowerCase();

    return allDataItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle.toLowerCase().includes(q);
      const matchGroup = item.group.toLowerCase().includes(q);
      const matchBadge = (item.badgeText ?? '').toLowerCase().includes(q);
      return matchTitle || matchSub || matchGroup || matchBadge;
    });
  }, [query, allDataItems]);

  // Group items by category for visual sections
  const groupedItems = React.useMemo(() => {
    const groups: { name: string; items: SearchItem[] }[] = [];
    const groupMap = new Map<string, SearchItem[]>();

    displayedItems.forEach((item) => {
      if (!groupMap.has(item.group)) {
        groupMap.set(item.group, []);
      }
      groupMap.get(item.group)!.push(item);
    });

    groupMap.forEach((items, name) => {
      groups.push({ name, items });
    });

    return groups;
  }, [displayedItems]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleSelect = React.useCallback(
    (item: SearchItem) => {
      handleOpenChange(false);
      router.push(item.href);
    },
    [handleOpenChange, router],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (displayedItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayedItems.length) % displayedItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = displayedItems[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      handleOpenChange(false);
    }
  };

  // Map flat index to item ID
  let currentFlatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <DialogTitle className="sr-only">Command Search &amp; Quick Navigation</DialogTitle>

        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, sprints, risks, teams..."
            className="w-full py-1 text-sm text-slate-900 dark:text-slate-100 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear search query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                setQuery('');
              }}
              className="text-xs font-semibold text-rose-800 dark:text-rose-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
          {loading && allDataItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Searching real workspace records...
              </p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No matching results found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No projects, tasks, sprints, or risks match &quot;<strong className="text-slate-700 dark:text-slate-300">{query}</strong>&quot;.
              </p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.name} className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  {group.name === 'Quick Navigation' && <Sparkles className="h-3 w-3 text-primary" />}
                  <span>{group.name}</span>
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const itemFlatIndex = currentFlatIndex++;
                    const isSelected = itemFlatIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemFlatIndex)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 text-slate-900 dark:text-slate-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badgeText && (
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {item.badgeText}
                            </span>
                          )}
                          <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-primary' : 'opacity-0'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono">
              Esc
            </kbd>
            <span>Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
