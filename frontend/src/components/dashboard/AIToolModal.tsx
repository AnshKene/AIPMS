'use client';

import * as React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Sliders,
  FileText,
  Bot,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Play,
  ChevronDown,
  TrendingUp,
  ShieldAlert,
  Clock,
  Layers,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  aiApi,
  type AiAnalysisResponse,
  type SimulationResponse,
  type ProjectBriefResponse,
  type SimulationScenario,
} from '@/lib/api/ai';
import { type Project } from '@/lib/api/projects';
import { formatProjectName, cn } from '@/lib/utils';

function formatTrajectory(trajectory?: string) {
  if (!trajectory) return { label: 'On Track', color: 'emerald' };
  switch (trajectory) {
    case 'ON_TRACK':
      return { label: 'On Track', color: 'emerald' };
    case 'AT_RISK':
      return { label: 'At Risk', color: 'amber' };
    case 'OFF_TRACK':
      return { label: 'Off Track', color: 'rose' };
    case 'INSUFFICIENT_DATA':
    default:
      return { label: 'Pending Data', color: 'slate' };
  }
}

export type AIToolType = 'insights' | 'simulator' | 'brief' | 'query' | null;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  confidence?: number;
  sources?: string[];
  followUps?: string[];
}

interface AIToolModalProps {
  tool: AIToolType;
  onClose: () => void;
  projects?: Project[];
  initialProjectId?: string;
  projectId?: string;
  projectName?: string;
}

export function AIToolModal({
  tool,
  onClose,
  projects = [],
  initialProjectId,
  projectId,
  projectName,
}: AIToolModalProps) {
  // Active tool tab state (allows seamless switching inside the modal)
  const [userSelectedTool, setUserSelectedTool] = React.useState<AIToolType | null>(null);
  const activeTool = userSelectedTool ?? tool;
  const setActiveTool = (t: AIToolType) => setUserSelectedTool(t);

  // Project selector state
  const defaultProjectId = initialProjectId || projectId || projects[0]?.id || '';
  const [userSelectedProjectId, setUserSelectedProjectId] = React.useState<string | null>(null);
  const selectedProjectId = userSelectedProjectId ?? defaultProjectId;
  const setSelectedProjectId = (id: string) => setUserSelectedProjectId(id);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);

  const activeProject = React.useMemo(() => {
    return (
      projects.find((p) => p.id === selectedProjectId) ||
      (projectName ? { id: selectedProjectId, name: projectName } : projects[0])
    );
  }, [projects, selectedProjectId, projectName]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Tool 1: Insights Data
  const [insightsData, setInsightsData] = React.useState<AiAnalysisResponse | null>(null);

  // Tool 2: Simulator Data
  const [scenario, setScenario] = React.useState<SimulationScenario>('MOVE_OVERDUE_TO_NEXT_SPRINT');
  const [extendDays, setExtendDays] = React.useState(5);
  const [simData, setSimData] = React.useState<SimulationResponse | null>(null);

  // Tool 3: Brief Data
  const [briefData, setBriefData] = React.useState<ProjectBriefResponse | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Tool 4: Query Chat Conversation
  const [queryInput, setQueryInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const counterRef = React.useRef(0);

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  // Load active tool data
  const loadToolData = React.useCallback(async (targetTool: AIToolType, projId: string) => {
    if (!targetTool || targetTool === 'query' || !projId) return;
    setLoading(true);
    setError(null);
    try {
      if (targetTool === 'insights') {
        const res = await aiApi.healthSummary(projId);
        setInsightsData(res);
      } else if (targetTool === 'simulator') {
        const res = await aiApi.simulate(projId, { scenario, extendDays });
        setSimData(res);
      } else if (targetTool === 'brief') {
        const res = await aiApi.brief(projId);
        setBriefData(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute AI tool action';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scenario, extendDays]);

  React.useEffect(() => {
    if (activeTool && activeTool !== 'query' && selectedProjectId) {
      Promise.resolve().then(() => {
        void loadToolData(activeTool, selectedProjectId);
      });
    }
  }, [activeTool, selectedProjectId, loadToolData]);

  const handleRunSimulation = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.simulate(selectedProjectId, { scenario, extendDays });
      setSimData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || queryInput).trim();
    if (!text || !selectedProjectId) return;

    counterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user-${counterRef.current}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQueryInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.query(selectedProjectId, text);
      counterRef.current += 1;
      const aiMsg: ChatMessage = {
        id: `ai-${counterRef.current}`,
        sender: 'ai',
        text: res.answer || 'No response generated by AI model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        followUps: res.suggestedQuestions,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process AI query';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBrief = () => {
    if (!briefData) return;
    const text = `AIPMS EXECUTIVE BRIEF: ${briefData.projectName || (activeProject ? activeProject.name : '')}\n\n${briefData.executiveSummary}\n\nWHAT IS GOING WELL:\n${briefData.whatIsGoingWell.map((w) => `• ${w}`).join('\n')}\n\nACTION PLAN:\n${briefData.actionPlan.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tool) return null;

  return (
    <Sheet open={Boolean(tool)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent hideCloseButton={true} className="max-w-xl md:max-w-2xl w-full p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <h2 className="sr-only">AIPMS Intelligence Studio</h2>

        {/* 1. Header Toolbar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0 bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-sm">
          {/* Top Row: Brand Info + Actions + Dedicated Close Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    Intelligence Studio
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 shrink-0">
                    Ollama Llama 3
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Autonomous delivery intelligence
                </p>
              </div>
            </div>

            {/* Header Right Actions: Desktop Project Selector + Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Project Context Selector Dropdown */}
              {projects.length > 0 && (
                <div className="hidden sm:block relative">
                  <button
                    type="button"
                    onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all max-w-[190px] cursor-pointer"
                    title={activeProject ? activeProject.name : 'Select Project'}
                  >
                    <span className="truncate">{activeProject ? formatProjectName(activeProject.name) : 'Project'}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>

                  {isProjectDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-56 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 text-xs">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setIsProjectDropdownOpen(false);
                            if (activeTool && activeTool !== 'query') {
                              void loadToolData(activeTool, p.id);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 font-medium truncate transition-colors flex items-center justify-between ${
                            p.id === selectedProjectId
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{formatProjectName(p.name)}</span>
                          {p.id === selectedProjectId && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dedicated Close Button: Separate, non-overlapping, accessible */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
                aria-label="Close Intelligence Studio"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Mobile Project Selector Bar (Clear full-width row with zero button collisions) */}
          {projects.length > 0 && (
            <div className="sm:hidden relative">
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Project:</span>
                  <span className="truncate font-bold text-blue-600 dark:text-blue-400">
                    {activeProject ? formatProjectName(activeProject.name) : 'Select Project'}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 text-xs">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                        if (activeTool && activeTool !== 'query') {
                          void loadToolData(activeTool, p.id);
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 font-medium truncate transition-colors flex items-center justify-between ${
                        p.id === selectedProjectId
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{formatProjectName(p.name)}</span>
                      {p.id === selectedProjectId && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unified Tool Studio Navigation Tabs (2x2 grid on mobile, flex on desktop) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setActiveTool('query')}
              className={cn(
                'flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
                activeTool === 'query'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Ask Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('insights')}
              className={cn(
                'flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
                activeTool === 'insights'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Project Insights</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('simulator')}
              className={cn(
                'flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
                activeTool === 'simulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <Sliders className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">What-If Simulator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('brief')}
              className={cn(
                'flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer truncate',
                activeTool === 'brief'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Executive Brief</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2. Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ASK COPILOT (CONVERSATIONAL STUDIO) */}
          {activeTool === 'query' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Empty State Banner & Quick Prompts if no chat messages */}
              {chatMessages.length === 0 ? (
                <div className="space-y-5 my-auto">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-purple-50/30 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 border border-blue-100/80 dark:border-blue-900/60 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-300">
                      <Sparkles className="h-4 w-4" />
                      <span>Delivery Copilot for {activeProject ? formatProjectName(activeProject.name) : 'Project'}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Ask anything regarding milestone deadlines, open risks, dependency bottlenecks, or team capacity.
                    </p>
                  </div>

                  {/* Categorized Prompt Chips */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Recommended Prompts
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          title: 'Delivery Trajectory',
                          desc: 'How is project trajectory progressing?',
                          icon: TrendingUp,
                          color: 'text-blue-600',
                        },
                        {
                          title: 'Top Risks Matrix',
                          desc: 'What are the top delivery risks right now?',
                          icon: ShieldAlert,
                          color: 'text-rose-600',
                        },
                        {
                          title: 'Sprint Bottlenecks',
                          desc: 'Identify critical path task bottlenecks',
                          icon: Clock,
                          color: 'text-amber-600',
                        },
                        {
                          title: 'Team Workload',
                          desc: 'Which team has the highest delivery pressure?',
                          icon: Layers,
                          color: 'text-indigo-600',
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => void handleSendQuery(item.desc)}
                            className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all group cursor-pointer"
                          >
                            <Icon className={`h-4 w-4 ${item.color} shrink-0 mt-0.5 group-hover:scale-110 transition-transform`} />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.title}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                                {item.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages Stream */
                <div ref={chatScrollRef} className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col space-y-1 text-xs',
                        msg.sender === 'user' ? 'items-end' : 'items-start',
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>{msg.sender === 'user' ? 'You' : 'Copilot'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={cn(
                          'p-3.5 rounded-2xl max-w-[88%] leading-relaxed',
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs font-medium'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-700/60 shadow-2xs space-y-2',
                        )}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 block">Suggested follow-ups:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.followUps.map((fu, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => void handleSendQuery(fu)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                >
                                  {fu}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Copilot is formulating intelligence analysis...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROJECT INSIGHTS */}
          {activeTool === 'insights' && (
            <div className="space-y-5">
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  <p>Synthesizing telemetry signals & delivery metrics...</p>
                </div>
              ) : insightsData ? (
                <div className="space-y-5 text-xs">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Health Score</span>
                      <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                        {insightsData.healthScore ?? 100}
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-400">/100</span>
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Status</span>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 truncate max-w-full justify-center',
                            insightsData.healthStatus === 'CRITICAL'
                              ? 'text-rose-600 border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30'
                              : insightsData.healthStatus === 'AT_RISK'
                              ? 'text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30'
                              : 'text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30',
                          )}
                        >
                          {insightsData.healthStatus ?? 'HEALTHY'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">Trajectory</span>
                      <div className="mt-1">
                        {(() => {
                          const traj = formatTrajectory(insightsData.deliveryTrajectory);
                          return (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 truncate max-w-full justify-center',
                                traj.color === 'emerald' && 'text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30',
                                traj.color === 'amber' && 'text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30',
                                traj.color === 'rose' && 'text-rose-600 border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30',
                                traj.color === 'slate' && 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800',
                              )}
                            >
                              {traj.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* AI Summary Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                      <Sparkles className="h-4 w-4" />
                      <span>Executive Health Synthesis</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {insightsData.summary}
                    </p>
                  </div>

                  {/* Recommendations */}
                  {insightsData.recommendations && insightsData.recommendations.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        Action Recommendations:
                      </span>
                      <div className="space-y-2">
                        {insightsData.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-xs shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 leading-snug">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void loadToolData('insights', selectedProjectId)}
                    className="w-full gap-2 text-xs h-10 rounded-xl font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Re-evaluate Insights</span>
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: WHAT-IF SIMULATOR */}
          {activeTool === 'simulator' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 shadow-2xs">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Select Simulation Scenario:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'MOVE_OVERDUE_TO_NEXT_SPRINT', label: 'Move Overdue Tasks to Next Sprint' },
                    { id: 'RESOLVE_HIGH_RISKS', label: 'Resolve High Severity Risks' },
                    { id: 'EXTEND_SPRINT_DEADLINE', label: 'Extend Sprint Deadline' },
                    { id: 'REASSIGN_WORKLOAD', label: 'Reassign Team Workload' },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScenario(sc.id as SimulationScenario)}
                      className={cn(
                        'p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2',
                        scenario === sc.id
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      <span>{sc.label}</span>
                      {scenario === sc.id && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
                    </button>
                  ))}
                </div>

                {scenario === 'EXTEND_SPRINT_DEADLINE' && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>Days to Extend</span>
                      <span className="font-bold text-blue-600">{extendDays} Days</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={14}
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={handleRunSimulation}
                  disabled={loading}
                  className="w-full gap-2 text-xs h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span>Run Scenario Simulation</span>
                </Button>
              </div>

              {simData && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    <div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Baseline Score</span>
                      <span className="text-xl font-black text-slate-900 dark:text-slate-100">{simData.baseline.healthScore}/100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Projected Score</span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {simData.simulated.healthScore}/100 ({simData.delta.healthScoreDelta >= 0 ? '+' : ''}{simData.delta.healthScoreDelta})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Scenario Trade-offs:</span>
                    <div className="space-y-1.5">
                      {simData.tradeOffs.map((t, i) => (
                        <div key={i} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXECUTIVE BRIEF */}
          {activeTool === 'brief' && (
            <div className="space-y-5">
              {loading ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  <p>Generating executive briefing & delivery report...</p>
                </div>
              ) : briefData ? (
                <div className="space-y-5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      AI Executive Delivery Synthesis
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyBrief}
                      className="gap-1.5 text-xs h-9 rounded-xl font-semibold shadow-2xs w-full sm:w-auto justify-center cursor-pointer border-slate-200 dark:border-slate-750"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied Brief!' : 'Copy Executive Brief'}</span>
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Executive Summary</h4>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{briefData.executiveSummary}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">What is Going Well:</span>
                    <div className="space-y-1.5">
                      {briefData.whatIsGoingWell.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">Needs Attention:</span>
                    <div className="space-y-1.5">
                      {briefData.whatNeedsAttention.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 text-slate-700 dark:text-slate-300">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block text-xs">Action Plan & Milestones:</span>
                    <div className="space-y-1.5">
                      {briefData.actionPlan.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-blue-600 shrink-0">{i + 1}.</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 3. Pinned Input Bar for Ask Copilot Tool */}
        {activeTool === 'query' && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendQuery();
                }}
                placeholder={`Ask Copilot about ${activeProject ? formatProjectName(activeProject.name) : 'your project'}...`}
                className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pr-12 pl-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => void handleSendQuery()}
                disabled={loading || !queryInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
                aria-label="Send query"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
