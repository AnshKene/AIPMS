/**
 * Team API module
 *
 * All requests go through the API Gateway at /api/teams.
 * Never calls the Team Service (:3003) directly.
 */

import { apiClient, ApiError } from './client';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const TEAM_ROLES = [
  'TEAM_LEAD',
  'MEMBER',
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  TEAM_LEAD: 'Team Lead',
  MEMBER: 'Member',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TeamListResponse {
  data: Team[];
  meta: TeamListMeta;
}

export interface TeamMemberListResponse {
  data: TeamMember[];
  meta: TeamListMeta;
}

export interface ListTeamsParams {
  page?: number;
  limit?: number;
  projectId?: string;
}

export interface ListTeamMembersParams {
  page?: number;
  limit?: number;
  role?: TeamRole | '';
  userId?: string;
}

export interface CreateTeamPayload {
  projectId: string;
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface AddTeamMemberPayload {
  userId: string;
  role?: TeamRole;
}

export interface UpdateTeamMemberPayload {
  role: TeamRole;
}

// ─── Error Formatter ─────────────────────────────────────────────────────────

/**
 * Transforms API errors or database constraint messages into clean user-facing feedback.
 */
export function formatTeamError(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'This user is already a member of this team.';
    }
    if (error.status === 404) {
      return 'The requested team or member was not found.';
    }
    if (error.status === 400) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('uuid')) {
        return 'Please provide a valid ID in UUID format.';
      }
      if (msg.toLowerCase().includes('name is required')) {
        return 'Team name is required.';
      }
      return msg || 'Invalid request data.';
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.toLowerCase().includes('duplicate') ||
      msg.toLowerCase().includes('unique') ||
      msg.toLowerCase().includes('already exists')
    ) {
      return 'This user is already a member of this team.';
    }
    return msg;
  }

  return fallback;
}

// ─── Team API Functions ──────────────────────────────────────────────────────

/**
 * Get paginated teams.
 */
export async function listTeams(
  params: ListTeamsParams = {},
): Promise<TeamListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.projectId) {
    queryParams.projectId = params.projectId;
  }

  return apiClient.get<TeamListResponse>('teams', {
    params: queryParams,
  });
}

/**
 * Get a single team by ID.
 */
export async function getTeam(id: string): Promise<Team> {
  return apiClient.get<Team>(`teams/${id}`);
}

/**
 * Create a new team.
 */
export async function createTeam(
  payload: CreateTeamPayload,
): Promise<Team> {
  return apiClient.post<Team>('teams', payload);
}

/**
 * Update an existing team.
 */
export async function updateTeam(
  id: string,
  payload: UpdateTeamPayload,
): Promise<Team> {
  return apiClient.patch<Team>(`teams/${id}`, payload);
}

/**
 * Delete a team.
 */
export async function deleteTeam(
  id: string,
): Promise<{ message: string; id?: string }> {
  return apiClient.delete<{ message: string; id?: string }>(`teams/${id}`);
}

// ─── Team Members API Functions ──────────────────────────────────────────────

/**
 * Get members of a team.
 */
export async function listTeamMembers(
  teamId: string,
  params: ListTeamMembersParams = {},
): Promise<TeamMemberListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.role) {
    queryParams.role = params.role;
  }

  if (params.userId) {
    queryParams.userId = params.userId;
  }

  return apiClient.get<TeamMemberListResponse>(`teams/${teamId}/members`, {
    params: queryParams,
  });
}

/**
 * Add a member to a team.
 */
export async function addTeamMember(
  teamId: string,
  payload: AddTeamMemberPayload,
): Promise<TeamMember> {
  return apiClient.post<TeamMember>(`teams/${teamId}/members`, payload);
}

/**
 * Update a team member's role.
 */
export async function updateTeamMember(
  teamId: string,
  memberId: string,
  payload: UpdateTeamMemberPayload,
): Promise<TeamMember> {
  return apiClient.patch<TeamMember>(
    `teams/${teamId}/members/${memberId}`,
    payload,
  );
}

/**
 * Remove a member from a team.
 */
export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `teams/${teamId}/members/${memberId}`,
  );
}