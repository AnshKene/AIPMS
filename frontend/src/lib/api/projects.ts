/**
 * Project API module
 * All requests go through the API Gateway at /api/projects.
 * Never calls the Project Service (:3002) directly.
 */

import { apiClient } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectListResponse {
  data: Project[];
  meta: ProjectListMeta;
}

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  status?: ProjectStatus | '';
  ownerId?: string;
}

export interface CreateProjectPayload {
  name: string;
  ownerId: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.status) queryParams.status = params.status;
  if (params.ownerId) queryParams.ownerId = params.ownerId;

  return apiClient.get<ProjectListResponse>('projects', { params: queryParams });
}

export async function getProject(id: string): Promise<Project> {
  return apiClient.get<Project>(`projects/${id}`);
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  return apiClient.post<Project>('projects', payload);
}

export async function updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
  return apiClient.patch<Project>(`projects/${id}`, payload);
}

export async function archiveProject(id: string): Promise<Project> {
  return apiClient.delete<Project>(`projects/${id}`);
}
