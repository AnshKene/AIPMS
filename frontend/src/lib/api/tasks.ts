/**
 * Task API module
 * All requests go through the API Gateway at /api/tasks.
 * Never calls the Task Service (:3004) directly.
 */

import { apiClient } from './client';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  teamId: string | null;
  creatorId: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskListResponse {
  data: Task[];
  meta: TaskListMeta;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
}

export interface TaskDependencyListResponse {
  data: TaskDependency[];
  meta: TaskListMeta;
}

export interface ListTasksParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  assigneeId?: string;
  teamId?: string;
}

export interface CreateTaskPayload {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  teamId?: string;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  teamId?: string;
  startDate?: string;
  dueDate?: string;
}

export interface AddTaskDependencyPayload {
  dependsOnTaskId: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function listTasks(params: ListTasksParams = {}): Promise<TaskListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.projectId) queryParams.projectId = params.projectId;
  if (params.status) queryParams.status = params.status;
  if (params.priority) queryParams.priority = params.priority;
  if (params.assigneeId) queryParams.assigneeId = params.assigneeId;
  if (params.teamId) queryParams.teamId = params.teamId;

  return apiClient.get<TaskListResponse>('tasks', { params: queryParams });
}

export async function getTask(id: string): Promise<Task> {
  return apiClient.get<Task>(`tasks/${id}`);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return apiClient.post<Task>('tasks', payload);
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  return apiClient.patch<Task>(`tasks/${id}`, payload);
}

export async function deleteTask(id: string): Promise<{ message: string; id: string }> {
  return apiClient.delete<{ message: string; id: string }>(`tasks/${id}`);
}

export async function getTaskDependencies(
  taskId: string,
  params: { page?: number; limit?: number } = {},
): Promise<TaskDependencyListResponse> {
  return apiClient.get<TaskDependencyListResponse>(`tasks/${taskId}/dependencies`, {
    params: { page: params.page, limit: params.limit },
  });
}

export async function addTaskDependency(
  taskId: string,
  payload: AddTaskDependencyPayload,
): Promise<TaskDependency> {
  return apiClient.post<TaskDependency>(`tasks/${taskId}/dependencies`, payload);
}

export async function removeTaskDependency(
  taskId: string,
  dependencyId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`tasks/${taskId}/dependencies/${dependencyId}`);
}
