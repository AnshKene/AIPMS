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

export async function unarchiveProject(id: string): Promise<Project> {
  return apiClient.patch<Project>(`projects/${id}/unarchive`);
}

export interface TransferOwnershipPayload {
  newOwnerId: string;
}

export async function transferProjectOwnership(
  id: string,
  payload: TransferOwnershipPayload,
): Promise<Project> {
  return apiClient.post<Project>(`projects/${id}/transfer-ownership`, payload);
}

export type ProjectMemberRole = 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: string;
  createdBy: string | null;
}

export interface AddProjectMemberPayload {
  userId: string;
  role: ProjectMemberRole;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return apiClient.get<ProjectMember[]>(`projects/${projectId}/members`);
}

export async function addProjectMember(
  projectId: string,
  payload: AddProjectMemberPayload,
): Promise<ProjectMember> {
  return apiClient.post<ProjectMember>(`projects/${projectId}/members`, payload);
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(`projects/${projectId}/members/${userId}`);
}
