/**
 * Risk API Module
 * Communicates strictly through the API Gateway at /api/risks.
 */

import { apiClient, ApiError } from './client';

// ─── Enums & Types ────────────────────────────────────────────────────────────

export const RISK_PROBABILITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskProbability = (typeof RISK_PROBABILITIES)[number];

export const RISK_IMPACTS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskImpact = (typeof RISK_IMPACTS)[number];

export const RISK_STATUSES = ['OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED', 'CLOSED'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  riskScore: number;
  status: RiskStatus;
  mitigationPlan: string | null;
  ownerId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRisksParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: RiskStatus;
  probability?: RiskProbability;
  impact?: RiskImpact;
}

export interface CreateRiskPayload {
  projectId: string;
  title: string;
  description?: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  status?: RiskStatus;
  mitigationPlan?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
}

export interface UpdateRiskPayload {
  title?: string;
  description?: string | null;
  probability?: RiskProbability;
  impact?: RiskImpact;
  status?: RiskStatus;
  mitigationPlan?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
}

// ─── Backend DTO Representation ──────────────────────────────────────────────

interface RawRisk {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  risk_score: number;
  status: RiskStatus;
  mitigation_plan?: string | null;
  owner_id?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Score Calculator & Transformation Helpers ──────────────────────────────

export function calculateRiskScore(probability: RiskProbability, impact: RiskImpact): number {
  const probVal = probability === 'HIGH' ? 3 : probability === 'MEDIUM' ? 2 : 1;
  const impactVal = impact === 'HIGH' ? 3 : impact === 'MEDIUM' ? 2 : 1;
  return probVal * impactVal;
}

export function toIsoDateString(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  return trimmed;
}

export function mapRiskFromApi(raw: unknown): Risk {
  if (!raw || typeof raw !== 'object') {
    return raw as Risk;
  }
  const r = raw as Partial<RawRisk> & Partial<Risk>;
  const probability = (r.probability ?? 'LOW') as RiskProbability;
  const impact = (r.impact ?? 'LOW') as RiskImpact;
  const calculatedScore = calculateRiskScore(probability, impact);

  return {
    id: r.id ?? '',
    projectId: r.project_id ?? r.projectId ?? '',
    title: r.title ?? '',
    description: r.description ?? null,
    probability,
    impact,
    riskScore: r.risk_score ?? r.riskScore ?? calculatedScore,
    status: (r.status ?? 'OPEN') as RiskStatus,
    mitigationPlan: r.mitigation_plan ?? r.mitigationPlan ?? null,
    ownerId: r.owner_id ?? r.ownerId ?? null,
    dueDate: r.due_date ?? r.dueDate ?? null,
    createdAt: r.created_at ?? r.createdAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  };
}

// ─── Error Formatter ──────────────────────────────────────────────────────────

export function formatRiskError(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (error instanceof ApiError) {
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export async function listRisks(params: ListRisksParams = {}): Promise<Risk[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.projectId) queryParams.project_id = params.projectId;
  if (params.status) queryParams.status = params.status;
  if (params.probability) queryParams.probability = params.probability;
  if (params.impact) queryParams.impact = params.impact;

  const response = await apiClient.get<RawRisk[] | { data: RawRisk[] }>('risks', {
    params: queryParams,
  });

  if (Array.isArray(response)) {
    return response.map(mapRiskFromApi);
  }
  if (response && Array.isArray((response as { data: RawRisk[] }).data)) {
    return (response as { data: RawRisk[] }).data.map(mapRiskFromApi);
  }
  return [];
}

export async function getRisk(id: string): Promise<Risk> {
  const raw = await apiClient.get<RawRisk>(`risks/${id}`);
  return mapRiskFromApi(raw);
}

export async function createRisk(payload: CreateRiskPayload): Promise<Risk> {
  const body: Record<string, unknown> = {
    project_id: payload.projectId,
    title: payload.title.trim(),
    probability: payload.probability,
    impact: payload.impact,
  };

  if (payload.description) body.description = payload.description.trim();
  if (payload.status) body.status = payload.status;
  if (payload.mitigationPlan) body.mitigation_plan = payload.mitigationPlan.trim();
  if (payload.ownerId) body.owner_id = payload.ownerId;
  if (payload.dueDate) body.due_date = toIsoDateString(payload.dueDate);

  const raw = await apiClient.post<RawRisk>('risks', body);
  return mapRiskFromApi(raw);
}

export async function updateRisk(id: string, payload: UpdateRiskPayload): Promise<Risk> {
  const body: Record<string, unknown> = {};

  if (payload.title !== undefined) body.title = payload.title.trim();
  if (payload.description !== undefined) body.description = payload.description ? payload.description.trim() : null;
  if (payload.probability !== undefined) body.probability = payload.probability;
  if (payload.impact !== undefined) body.impact = payload.impact;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.mitigationPlan !== undefined) body.mitigation_plan = payload.mitigationPlan ? payload.mitigationPlan.trim() : null;
  if (payload.ownerId !== undefined) body.owner_id = payload.ownerId || null;
  if (payload.dueDate !== undefined) body.due_date = toIsoDateString(payload.dueDate);

  const raw = await apiClient.patch<RawRisk>(`risks/${id}`, body);
  return mapRiskFromApi(raw);
}

export async function deleteRisk(id: string): Promise<{ message: string; id: string }> {
  return apiClient.delete<{ message: string; id: string }>(`risks/${id}`);
}
