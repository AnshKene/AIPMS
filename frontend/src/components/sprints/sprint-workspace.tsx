'use client';

import * as React from 'react';
import { type Sprint } from '@/lib/api/sprints';
import {
  type Task,
  type TaskStatus,
  type CreateTaskPayload,
  TASK_STATUSES,
  updateTask,
  createTask,
} from '@/lib/api/tasks';
import { SprintStatusBadge } from './sprint-status-badge';
import { SprintHealthSnapshot } from './sprint-health';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/tasks/task-badges';
import { TaskDetail } from '@/components/tasks/task-detail';
import { TaskForm } from '@/components/tasks/task-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  ArrowLeft,
  Plus,
  Layers,
  Search,
  CheckCircle2,
  Calendar,
  LayoutGrid,
  ListFilter,
  Check,
  Target,
  Loader2,
} from 'lucide-react';

interface SprintWorkspaceProps {
  sprint: Sprint;
  allProjectTasks: Task[];
  allProjectSprints?: Sprint[];
  projectName?: string;
  onBack: () => void;
  onTaskUpdated: (task: Task) => void;
  onTaskCreated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export function SprintWorkspace({
  sprint,
  allProjectTasks,
  allProjectSprints = [],
  projectName,
  onBack,
  onTaskUpdated,
  onTaskCreated,
  onTaskDeleted,
}: SprintWorkspaceProps) {
  const [viewMode, setViewMode] = React.useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeMobileStatus, setActiveMobileStatus] = React.useState<TaskStatus | 'ALL'>('ALL');

  // Backlog Drawer & Batch Selection
  const [backlogDrawerOpen, setBacklogDrawerOpen] = React.useState(false);
  const [backlogSearch, setBacklogSearch] = React.useState('');
  const [selectedBacklogIds, setSelectedBacklogIds] = React.useState<string[]>([]);
  const [batchLoading, setBatchLoading] = React.useState(false);

  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null);

  // Other available sprints in the same project for quick reassignment
  const destinationSprints = React.useMemo(() => {
    return allProjectSprints.filter(
      (s) => s.projectId === sprint.projectId && s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
    );
  }, [allProjectSprints, sprint.projectId]);

  // Filter tasks belonging to this sprint
  const sprintTasks = React.useMemo(() => {
    return allProjectTasks.filter((t) => t.sprintId === sprint.id);
  }, [allProjectTasks, sprint.id]);

  // Backlog tasks for this project (unassigned to any sprint)
  const backlogTasks = React.useMemo(() => {
    return allProjectTasks.filter(
      (t) => (!t.sprintId || t.sprintId === null) && t.projectId === sprint.projectId,
    );
  }, [allProjectTasks, sprint.projectId]);

  // Filter sprint tasks by search query
  const filteredSprintTasks = React.useMemo(() => {
    if (!searchQuery.trim()) return sprintTasks;
    const q = searchQuery.toLowerCase().trim();
    return sprintTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [sprintTasks, searchQuery]);

  // Filter backlog tasks by search query
  const filteredBacklogTasks = React.useMemo(() => {
    if (!backlogSearch.trim()) return backlogTasks;
    const q = backlogSearch.toLowerCase().trim();
    return backlogTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [backlogTasks, backlogSearch]);

  // Assign a single task from backlog to this sprint
  async function handleAssignToSprint(taskId: string) {
    setActionLoadingId(taskId);
    try {
      const updated = await updateTask(taskId, { sprintId: sprint.id });
      onTaskUpdated(updated);
      setSelectedBacklogIds((prev) => prev.filter((id) => id !== taskId));
      showFeedback('Task added to sprint');
    } catch {
      showFeedback('Failed to assign task');
    } finally {
      setActionLoadingId(null);
    }
  }

  // Batch assign selected backlog tasks
  async function handleBatchAssignBacklog() {
    if (selectedBacklogIds.length === 0) return;
    setBatchLoading(true);
    let successCount = 0;
    try {
      for (const taskId of selectedBacklogIds) {
        try {
          const updated = await updateTask(taskId, { sprintId: sprint.id });
          onTaskUpdated(updated);
          successCount++;
        } catch {
          // continue with next
        }
      }
      setSelectedBacklogIds([]);
      showFeedback(`${successCount} ${successCount === 1 ? 'task' : 'tasks'} added to sprint`);
      if (successCount === selectedBacklogIds.length) {
        setBacklogDrawerOpen(false);
      }
    } finally {
      setBatchLoading(false);
    }
  }

  // Toggle selection for batch backlog assignment
  function toggleBacklogSelection(taskId: string) {
    setSelectedBacklogIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  }

  // Move task to another sprint or backlog
  async function handleMoveSprint(taskId: string, targetSprintId: string | null) {
    setActionLoadingId(taskId);
    try {
      const updated = await updateTask(taskId, { sprintId: targetSprintId });
      onTaskUpdated(updated);
      if (targetSprintId === null) {
        showFeedback('Task moved to project backlog');
      } else {
        const targetSprint = allProjectSprints.find((s) => s.id === targetSprintId);
        showFeedback(`Task moved to ${targetSprint?.name || 'target sprint'}`);
      }
    } catch {
      showFeedback('Failed to move task');
    } finally {
      setActionLoadingId(null);
    }
  }

  // Quick Status Transition
  async function handleQuickStatusChange(taskId: string, newStatus: TaskStatus) {
    setActionLoadingId(taskId);
    try {
      const updated = await updateTask(taskId, { status: newStatus });
      onTaskUpdated(updated);
    } catch {
      showFeedback('Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  }

  function showFeedback(msg: string) {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  }

  const columns: { status: TaskStatus; label: string }[] = [
    { status: 'TODO', label: 'To Do' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'IN_REVIEW', label: 'In Review' },
    { status: 'DONE', label: 'Done' },
    { status: 'BLOCKED', label: 'Blocked' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Sprint Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 -ml-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sprints
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBacklogIds([]);
                setBacklogDrawerOpen(true);
              }}
              className="text-xs gap-1.5 bg-white shadow-2xs cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>Assign from Backlog</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                {backlogTasks.length}
              </span>
            </Button>

            <TaskForm
              mode="create"
              defaultProjectId={sprint.projectId}
              trigger={
                <Button size="sm" className="text-xs gap-1.5 shadow-xs cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </Button>
              }
              onSubmit={(payload) =>
                createTask({ ...(payload as CreateTaskPayload), sprintId: sprint.id })
              }
              onSuccess={(created) => {
                onTaskCreated(created);
                showFeedback('Task created and assigned to sprint');
              }}
            />
          </div>
        </div>

        {/* Sprint Title & Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{sprint.name}</h1>
            <SprintStatusBadge status={sprint.status} />
            {projectName && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {projectName}
              </span>
            )}
          </div>

          {sprint.goal && (
            <div className="flex items-start gap-2 text-xs text-slate-600 max-w-3xl">
              <Target className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold text-slate-900">Sprint Goal: </strong>
                {sprint.goal}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 animate-in fade-in-0 duration-200">
          <Check className="h-4 w-4 shrink-0 text-blue-600" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Sprint Health Snapshot (Factual Derived Metrics with Attention Trigger) */}
      <SprintHealthSnapshot
        sprint={sprint}
        tasks={sprintTasks}
        onFilterBlocked={() => {
          setActiveMobileStatus('BLOCKED');
          setSearchQuery('');
        }}
      />

      {/* Toolbar: Search, View Switcher, Counts */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search sprint tasks by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {filteredSprintTasks.length} {filteredSprintTasks.length === 1 ? 'task' : 'tasks'} in sprint
          </span>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Board View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="List View"
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Status Tabs for `< md` screens */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveMobileStatus('ALL')}
          className={`px-3 py-1.5 rounded-md font-medium shrink-0 cursor-pointer ${
            activeMobileStatus === 'ALL'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          All ({filteredSprintTasks.length})
        </button>
        {columns.map(({ status, label }) => {
          const count = filteredSprintTasks.filter((t) => t.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setActiveMobileStatus(status)}
              className={`px-3 py-1.5 rounded-md font-medium shrink-0 cursor-pointer ${
                activeMobileStatus === status
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty Sprint Tasks State */}
      {sprintTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">No tasks in this sprint</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pull existing unassigned tasks from the project backlog or create new tasks directly for this sprint.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBacklogIds([]);
                setBacklogDrawerOpen(true);
              }}
              className="gap-1.5 text-xs bg-white cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              Assign Backlog Tasks ({backlogTasks.length})
            </Button>
            <TaskForm
              mode="create"
              defaultProjectId={sprint.projectId}
              trigger={
                <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                  Create Task
                </Button>
              }
              onSubmit={(payload) =>
                createTask({ ...(payload as CreateTaskPayload), sprintId: sprint.id })
              }
              onSuccess={(created) => {
                onTaskCreated(created);
                showFeedback('Task created and assigned to sprint');
              }}
            />
          </div>
        </div>
      ) : viewMode === 'board' ? (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
          {columns.map(({ status, label }) => {
            const columnTasks = filteredSprintTasks.filter((t) => t.status === status);

            // On mobile, if a specific status filter tab is selected, hide other columns
            if (activeMobileStatus !== 'ALL' && activeMobileStatus !== status) {
              return null;
            }

            return (
              <div
                key={status}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 min-h-[320px] space-y-2.5"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="flex flex-col gap-2 flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200/80 rounded-lg p-4 text-center">
                      <span className="text-[11px] text-slate-400">No {label.toLowerCase()} tasks</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                      >
                        {/* Title with Task Detail Trigger */}
                        <TaskDetail
                          taskId={task.id}
                          onTaskUpdated={onTaskUpdated}
                          onTaskDeleted={onTaskDeleted}
                          trigger={
                            <button
                              type="button"
                              className="text-left w-full cursor-pointer focus:outline-none"
                            >
                              <p className="text-xs font-semibold text-slate-900 hover:text-blue-600 line-clamp-2 leading-snug">
                                {task.title}
                              </p>
                            </button>
                          }
                        />

                        {/* Badges & Meta */}
                        <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-500">
                          <TaskPriorityBadge priority={task.priority} />
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        {/* Card Action Row: Status & Reassignment Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                          {/* Quick Status Dropdown */}
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                            }
                            disabled={actionLoadingId === task.id}
                            className="h-6 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600"
                            aria-label="Change status"
                          >
                            {TASK_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st.replace('_', ' ')}
                              </option>
                            ))}
                          </select>

                          {/* Quick Move Sprint Dropdown */}
                          <select
                            value={task.sprintId || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleMoveSprint(task.id, val ? val : null);
                            }}
                            disabled={actionLoadingId === task.id}
                            className="h-6 max-w-[100px] truncate rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600"
                            aria-label="Move task to sprint"
                          >
                            <option value={sprint.id}>Current Sprint</option>
                            <option value="">Backlog</option>
                            {destinationSprints
                              .filter((s) => s.id !== sprint.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredSprintTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50/80 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <TaskStatusBadge status={task.status} />
                  <TaskDetail
                    taskId={task.id}
                    onTaskUpdated={onTaskUpdated}
                    onTaskDeleted={onTaskDeleted}
                    trigger={
                      <button
                        type="button"
                        className="text-left font-semibold text-xs text-slate-900 hover:text-blue-600 truncate cursor-pointer"
                      >
                        {task.title}
                      </button>
                    }
                  />
                </div>

                <div className="flex items-center gap-2.5 shrink-0 justify-between sm:justify-end text-xs">
                  <TaskPriorityBadge priority={task.priority} />

                  {task.dueDate && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}

                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                    }
                    disabled={actionLoadingId === task.id}
                    className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 cursor-pointer"
                  >
                    {TASK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>

                  <select
                    value={task.sprintId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleMoveSprint(task.id, val ? val : null);
                    }}
                    disabled={actionLoadingId === task.id}
                    className="h-7 max-w-[120px] truncate rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-600 cursor-pointer"
                  >
                    <option value={sprint.id}>In this sprint</option>
                    <option value="">Move to Backlog</option>
                    {destinationSprints
                      .filter((s) => s.id !== sprint.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Move to {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign from Backlog Sheet (with 1-click & Multi-select Batch Assignment) */}
      <Sheet open={backlogDrawerOpen} onOpenChange={setBacklogDrawerOpen}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>Project Backlog Tasks</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select and assign unassigned tasks from {projectName || 'the project'} to{' '}
              <strong>{sprint.name}</strong>.
            </p>
          </div>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search backlog tasks..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>

            {/* Batch Allocation Action Bar */}
            {filteredBacklogTasks.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium">
                  {selectedBacklogIds.length} of {filteredBacklogTasks.length} selected
                </span>

                <Button
                  size="sm"
                  disabled={selectedBacklogIds.length === 0 || batchLoading}
                  onClick={handleBatchAssignBacklog}
                  className="h-7 text-xs gap-1.5 cursor-pointer"
                >
                  {batchLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Add Selected ({selectedBacklogIds.length})</span>
                </Button>
              </div>
            )}

            {/* Backlog List */}
            {filteredBacklogTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No backlog tasks available</p>
                <p className="text-[11px] text-slate-400">
                  All project tasks are currently assigned to sprints, or no tasks match your search.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                {filteredBacklogTasks.map((task) => {
                  const isSelected = selectedBacklogIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleBacklogSelection(task.id)}
                          aria-label={`Select task ${task.title}`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={task.title}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <TaskStatusBadge status={task.status} className="text-[10px] py-0 px-1.5" />
                            <TaskPriorityBadge priority={task.priority} />
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignToSprint(task.id)}
                        disabled={actionLoadingId === task.id || batchLoading}
                        className="h-7 text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
