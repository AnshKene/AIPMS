import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuditEventInput {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetResource?: string;
  previousValue?: string;
  newValue?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
  context?: Record<string, unknown>;
}

export interface AuditRecord extends AuditEventInput {
  id: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'FAILURE';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditMemoryLog: AuditRecord[] = [];
  private supabase: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');
    const anonKey = this.configService.get<string>('supabase.anonKey');

    if (!serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY is not configured for AuditService. Audit writes may be rejected by Supabase RLS policies.',
      );
    }

    const keyToUse = serviceRoleKey || anonKey;

    if (supabaseUrl && keyToUse) {
      try {
        this.supabase = createClient(supabaseUrl, keyToUse);
      } catch (err) {
        this.logger.warn(`Could not initialize Supabase audit client: ${(err as Error).message}`);
      }
    }

    // Seed initial durable audit logs for demonstration and activity tracing
    this.seedInitialAuditLogs();
  }

  private seedInitialAuditLogs() {
    const now = new Date();
    const seedEvents: AuditRecord[] = [
      {
        id: 'audit-001',
        actorId: 'admin-user-001',
        actorEmail: 'admin@aipms.com',
        action: 'ROLE_ASSIGNED',
        targetResource: 'pm-user-002',
        previousValue: 'TEAM_MEMBER',
        newValue: 'PROJECT_MANAGER',
        outcome: 'SUCCESS',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        context: { reason: 'Initial team lead designation' },
      },
      {
        id: 'audit-002',
        actorId: 'admin-user-001',
        actorEmail: 'admin@aipms.com',
        action: 'SYSTEM_HEALTH_CHECK',
        targetResource: 'API Gateway',
        outcome: 'SUCCESS',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
        context: { latencyMs: 14, status: 'HEALTHY' },
      },
      {
        id: 'audit-003',
        actorId: 'system',
        actorEmail: 'system@aipms.internal',
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        targetResource: '/api/admin/users',
        previousValue: undefined,
        newValue: undefined,
        outcome: 'FAILURE',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        context: { reason: 'Missing ADMIN role header', ip: '192.168.1.102' },
      },
      {
        id: 'audit-004',
        actorId: 'admin-user-001',
        actorEmail: 'admin@aipms.com',
        action: 'ROLE_ASSIGNED',
        targetResource: 'member-user-003',
        previousValue: 'VIEWER',
        newValue: 'TEAM_MEMBER',
        outcome: 'SUCCESS',
        timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        context: { reason: 'Developer onboarded to Core Sprint' },
      },
    ];

    this.auditMemoryLog.push(...seedEvents);
  }

  async recordEvent(input: AuditEventInput): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      actorId: input.actorId || 'anonymous',
      actorEmail: input.actorEmail,
      action: input.action,
      targetResource: input.targetResource,
      previousValue: input.previousValue,
      newValue: input.newValue,
      outcome: input.outcome || 'SUCCESS',
      context: input.context ? this.sanitizeContext(input.context) : undefined,
      timestamp: new Date().toISOString(),
    };

    // Store in memory
    this.auditMemoryLog.unshift(record);

    // Attempt durable database write if Supabase client available
    if (this.supabase) {
      try {
        const { error } = await this.supabase.from('audit_logs').insert([
          {
            id: record.id,
            actor_id: record.actorId,
            actor_email: record.actorEmail,
            action: record.action,
            target_resource: record.targetResource,
            previous_value: record.previousValue,
            new_value: record.newValue,
            outcome: record.outcome,
            context: record.context,
            created_at: record.timestamp,
          },
        ]);

        if (error) {
          this.logger.error(
            `Failed server-side audit write to database: ${error.message} (code: ${error.code ?? 'unknown'})`,
          );
        }
      } catch (err) {
        this.logger.error(`Exception during server-side audit write: ${(err as Error).message}`);
      }
    }

    return record;
  }

  async queryLogs(options?: {
    action?: string;
    actorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    // Attempt durable database query if Supabase client available
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('audit_logs')
          .select('*', { count: 'exact' });

        if (options?.action) {
          query = query.ilike('action', options.action);
        }
        if (options?.actorId) {
          query = query.or(`actor_id.eq.${options.actorId},actor_email.ilike.${options.actorId}`);
        }
        if (options?.search) {
          query = query.or(
            `action.ilike.%${options.search}%,actor_email.ilike.%${options.search}%,target_resource.ilike.%${options.search}%`,
          );
        }

        const page = Math.max(1, options?.page || 1);
        const limit = Math.min(100, Math.max(1, options?.limit || 20));
        const startIndex = (page - 1) * limit;

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(startIndex, startIndex + limit - 1);

        if (!error && data && data.length > 0) {
          const total = count ?? data.length;
          return {
            items: data.map((d: any) => ({
              id: d.id,
              actorId: d.actor_id,
              actorEmail: d.actor_email,
              action: d.action,
              targetResource: d.target_resource,
              previousValue: d.previous_value,
              newValue: d.new_value,
              outcome: d.outcome,
              context: d.context,
              timestamp: d.created_at,
            })),
            meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit) || 1,
            },
          };
        }
      } catch (err) {
        this.logger.warn(`Could not query audit logs from Supabase: ${(err as Error).message}`);
      }
    }

    // Fallback to in-memory log
    let logs = [...this.auditMemoryLog];

    if (options?.action) {
      logs = logs.filter((l) => l.action.toLowerCase() === options.action?.toLowerCase());
    }

    if (options?.actorId) {
      logs = logs.filter(
        (l) =>
          l.actorId.toLowerCase() === options.actorId?.toLowerCase() ||
          l.actorEmail?.toLowerCase() === options.actorId?.toLowerCase(),
      );
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.actorId.toLowerCase().includes(q) ||
          l.actorEmail?.toLowerCase().includes(q) ||
          l.targetResource?.toLowerCase().includes(q) ||
          l.previousValue?.toLowerCase().includes(q) ||
          l.newValue?.toLowerCase().includes(q),
      );
    }

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const items = logs.slice(startIndex, startIndex + limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'accessToken', 'refreshToken'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
