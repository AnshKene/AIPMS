/**
 * Sprint API Module
 * Communicates strictly through the API Gateway at /api/sprints.
 */

import { apiClient, ApiError } from './client';

// ─── Enums & Types ────────────────────────────────────────────────────────────

export const SPRINT_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListSprintsParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: SprintStatus;
}

export interface CreateSprintPayload {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintPayload {
  name?: string;
  goal?: string | null;
  startDate?: string;
  endDate?: string;
}

// ─── Backend DTO Representation ──────────────────────────────────────────────

interface RawSprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

// ─── Transformation Helpers ───────────────────────────────────────────────────

/**
 * Deterministically converts a date string (YYYY-MM-DD or ISO) to a valid ISO-8601 string.
 */
export function toIsoDateString(val?: string | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  // Handle HTML <input type="date"> YYYY-MM-DD format deterministically
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  return trimmed;
}

/**
 * Maps snake_case backend sprint records to camelCase frontend domain model.
 */
export function mapSprintFromApi(raw: unknown): Sprint {
  if (!raw || typeof raw !== 'object') {
    return raw as Sprint;
  }
  const r = raw as Partial<RawSprint> & Partial<Sprint>;
  return {
    id: r.id ?? '',
    projectId: r.project_id ?? r.projectId ?? '',
    name: r.name ?? '',
    goal: r.goal ?? null,
    status: r.status ?? 'PLANNED',
    startDate: r.start_date ?? r.startDate ?? '',
    endDate: r.end_date ?? r.endDate ?? '',
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  };
}

// ─── Error Formatter ──────────────────────────────────────────────────────────

export function formatSprintError(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (error instanceof ApiError) {
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export async function listSprints(params: ListSprintsParams = {}): Promise<Sprint[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.projectId) queryParams.project_id = params.projectId;
  if (params.status) queryParams.status = params.status;

  const response = await apiClient.get<RawSprint[] | { data: RawSprint[] }>('sprints', {
    params: queryParams,
  });

  if (Array.isArray(response)) {
    return response.map(mapSprintFromApi);
  }
  if (response && Array.isArray((response as { data: RawSprint[] }).data)) {
    return (response as { data: RawSprint[] }).data.map(mapSprintFromApi);
  }
  return [];
}

export async function getSprint(id: string): Promise<Sprint> {
  const raw = await apiClient.get<RawSprint>(`sprints/${id}`);
  return mapSprintFromApi(raw);
}

export async function createSprint(payload: CreateSprintPayload): Promise<Sprint> {
  const body: Record<string, string | null | undefined> = {
    project_id: payload.projectId,
    name: payload.name.trim(),
    start_date: toIsoDateString(payload.startDate),
    end_date: toIsoDateString(payload.endDate),
  };

  if (payload.goal !== undefined && payload.goal !== null) {
    const trimmedGoal = payload.goal.trim();
    body.goal = trimmedGoal.length > 0 ? trimmedGoal : null;
  } else if (payload.goal === null) {
    body.goal = null;
  }

  const raw = await apiClient.post<RawSprint>('sprints', body);
  return mapSprintFromApi(raw);
}

export async function updateSprint(id: string, payload: UpdateSprintPayload): Promise<Sprint> {
  const body: Record<string, string | null | undefined> = {};

  if (payload.name !== undefined) {
    body.name = payload.name.trim();
  }
  if (payload.goal !== undefined) {
    if (payload.goal === null) {
      body.goal = null;
    } else {
      const trimmedGoal = payload.goal.trim();
      body.goal = trimmedGoal.length > 0 ? trimmedGoal : null;
    }
  }
  if (payload.startDate !== undefined) {
    body.start_date = toIsoDateString(payload.startDate);
  }
  if (payload.endDate !== undefined) {
    body.end_date = toIsoDateString(payload.endDate);
  }

  const raw = await apiClient.patch<RawSprint>(`sprints/${id}`, body);
  return mapSprintFromApi(raw);
}

export async function startSprint(id: string): Promise<Sprint> {
  const raw = await apiClient.post<RawSprint>(`sprints/${id}/start`);
  return mapSprintFromApi(raw);
}

export async function completeSprint(id: string): Promise<Sprint> {
  const raw = await apiClient.post<RawSprint>(`sprints/${id}/complete`);
  return mapSprintFromApi(raw);
}

export async function cancelSprint(id: string): Promise<Sprint> {
  const raw = await apiClient.post<RawSprint>(`sprints/${id}/cancel`);
  return mapSprintFromApi(raw);
}

export async function deleteSprint(id: string): Promise<{ message: string; id: string }> {
  return apiClient.delete<{ message: string; id: string }>(`sprints/${id}`);
}
