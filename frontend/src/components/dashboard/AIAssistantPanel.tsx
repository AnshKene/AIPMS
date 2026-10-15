'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import {
  Bot,
  AlertTriangle,
  Zap,
  Send,
  HelpCircle,
  Loader2,
  Sparkles,
  Layers,
  Target,
  GitBranch,
  Copy,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { aiApi } from '@/lib/api/ai';
import { type Project } from '@/lib/api/projects';
import { formatProjectName } from '@/lib/utils';

interface AIAssistantPanelProps {
  projectId?: string;
  projects?: Project[];
}

export function AIAssistantPanel({ projectId, projects = [] }: AIAssistantPanelProps) {
  const [userSelectedProjectId, setUserSelectedProjectId] = React.useState<string | null>(null);
  const selectedProjectId = userSelectedProjectId ?? projectId ?? projects[0]?.id ?? '';
  const [inputQuery, setInputQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [responseMessage, setResponseMessage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);

  const activeProject = React.useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const handleAction = async (actionType: string) => {
    if (!selectedProjectId) {
      setResponseMessage('Please select an active project to run AI analysis.');
      return;
    }

    setLoading(true);
    setResponseMessage(null);
    try {
      if (actionType === 'health') {
        const res = await aiApi.healthSummary(selectedProjectId);
        setResponseMessage(res?.summary || 'No project health summary available.');
      } else if (actionType === 'bottlenecks') {
        const res = await aiApi.bottlenecks(selectedProjectId);
        const count = res?.bottlenecks?.length ?? 0;
        const pressure = res?.dependencyPressure ?? 'LOW';
        const recs = res?.recommendations?.join(' ') || '';
        setResponseMessage(
          `Detected ${count} bottleneck task(s) with ${pressure} dependency pressure.\n\nRecommendations: ${
            recs || 'Continue active monitoring of critical path items.'
          }`,
        );
      } else if (actionType === 'brief') {
        const res = await aiApi.brief(selectedProjectId);
        setResponseMessage(res?.executiveSummary || 'No executive brief generated.');
      } else if (actionType === 'mitigations') {
        const res = await aiApi.riskMitigation(selectedProjectId);
        setResponseMessage(res?.summary || 'No risk mitigation plan returned.');
      } else if (actionType === 'plan') {
        const res = await aiApi.actionPlan(selectedProjectId);
        setResponseMessage(res?.summary || 'No action plan returned.');
      } else {
        setResponseMessage(`Executed AI action: ${actionType}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      setResponseMessage(`AI Service Notice: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text) return;

    if (!selectedProjectId) {
      setResponseMessage('Please select an active project to query AI.');
      return;
    }

    setLoading(true);
    setResponseMessage(null);
    try {
      const res = await aiApi.query(selectedProjectId, text);
      setResponseMessage(res?.answer || 'No answer returned from AI service.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      setResponseMessage(`AI Query Notice: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!responseMessage) return;
    void navigator.clipboard.writeText(responseMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow flex flex-col h-full space-y-4">
      {/* Header with Project Selector */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>AI Copilot</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                Llama 3
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Autonomous delivery intelligence</p>
          </div>
        </div>

        {/* Project Selector Trigger */}
        {projects.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors max-w-[130px]"
              title={activeProject ? activeProject.name : 'Select Project'}
            >
              <span className="truncate">{activeProject ? formatProjectName(activeProject.name) : 'Project'}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-52 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 text-xs">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setUserSelectedProjectId(p.id);
                      setIsProjectDropdownOpen(false);
                      setResponseMessage(null);
                    }}
                    className={`w-full text-left px-3 py-2 font-medium truncate transition-colors flex items-center justify-between ${
                      p.id === selectedProjectId
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{formatProjectName(p.name)}</span>
                    {p.id === selectedProjectId && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Pitch */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
          <span>How can I assist your team?</span>
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
          Ask questions or run automated intelligence routines for{' '}
          <strong className="text-slate-700 dark:text-slate-300 font-semibold">
            {activeProject ? formatProjectName(activeProject.name) : 'your project'}
          </strong>
          .
        </p>
      </div>

      {/* AI Response Display Box */}
      {responseMessage && (
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100/80 dark:border-indigo-900 text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-2 shadow-2xs">
          <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Intelligence Brief</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-white/80 dark:hover:bg-slate-800 rounded transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setResponseMessage(null)}
                className="p-1 hover:bg-white/80 dark:hover:bg-slate-800 rounded transition-colors"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>
          <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 font-normal">
            {responseMessage}
          </div>
        </div>
      )}

      {/* Action Suggestion Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => void handleAction('health')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Analyze project health
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
            Run →
          </span>
        </button>

        <button
          onClick={() => void handleAction('bottlenecks')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shadow-2xs group-hover:scale-105 transition-transform">
              <GitBranch className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Identify potential bottlenecks
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
            Run →
          </span>
        </button>

        <button
          onClick={() => void handleAction('brief')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Target className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Generate executive brief
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
            Run →
          </span>
        </button>

        <button
          onClick={() => void handleAction('mitigations')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Suggest risk mitigations
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
            Run →
          </span>
        </button>

        <button
          onClick={() => void handleAction('plan')}
          disabled={loading}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Create a project plan
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
            Run →
          </span>
        </button>
      </div>

      {/* Query Input Box */}
      <div className="relative">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSendQuery();
          }}
          placeholder={`Ask about ${activeProject ? formatProjectName(activeProject.name) : 'your projects'}...`}
          className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 pr-10 pl-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
        />
        <button
          onClick={() => void handleSendQuery()}
          disabled={loading || !inputQuery.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-40 disabled:hover:bg-blue-600 shadow-xs cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Suggested Questions List */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
          Suggested Questions
        </span>
        <div className="space-y-1 text-xs">
          {[
            `How is ${activeProject ? formatProjectName(activeProject.name) : 'this project'} progressing?`,
            'What are the top risks right now?',
            'Which team has the highest workload?',
            "Generate a summary of this month's activity",
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setInputQuery(q);
                void handleSendQuery(q);
              }}
              className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 transition-colors group cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors truncate">
                {q}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Status */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-xs"></span>
        <span>Local Ollama Model • Zero Data Leakage</span>
      </div>
    </Card>
  );
}
