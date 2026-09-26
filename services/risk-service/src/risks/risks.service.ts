import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateRiskDto } from './dto/create-risk.dto.js';
import { UpdateRiskDto } from './dto/update-risk.dto.js';
import { QueryRiskDto } from './dto/query-risk.dto.js';
import { RiskProbability } from './enums/risk-probability.enum.js';
import { RiskImpact } from './enums/risk-impact.enum.js';
import { RiskStatus } from './enums/risk-status.enum.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RisksService {
  private readonly logger = new Logger(RisksService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url') ?? '';
    const anonKey = this.configService.get<string>('supabase.anonKey') ?? '';
    this.supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  calculateRiskScore(probability: RiskProbability, impact: RiskImpact): number {
    const p = this.getNumericValue(probability);
    const i = this.getNumericValue(impact);
    return p * i;
  }

  private getNumericValue(value: string): number {
    switch (value) {
      case 'LOW':
        return 1;
      case 'MEDIUM':
        return 2;
      case 'HIGH':
        return 3;
      default:
        throw new BadRequestException(`Invalid enum value: '${value}'`);
    }
  }

  async create(dto: CreateRiskDto) {
    this.validateUuid(dto.project_id);
    if (dto.owner_id) {
      this.validateUuid(dto.owner_id);
    }

    const riskScore = this.calculateRiskScore(dto.probability, dto.impact);

    const newRisk = {
      project_id: dto.project_id,
      title: dto.title,
      description: dto.description ?? null,
      probability: dto.probability,
      impact: dto.impact,
      risk_score: riskScore,
      status: dto.status ?? RiskStatus.OPEN,
      mitigation_plan: dto.mitigation_plan ?? null,
      owner_id: dto.owner_id ?? null,
      due_date: dto.due_date ?? null,
    };

    const { data, error } = await this.supabase
      .from('risks')
      .insert([newRisk])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create risk: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to create risk');
    }

    return this.formatRisk(data);
  }

  async findAll(query: QueryRiskDto) {
    if (query.project_id) {
      this.validateUuid(query.project_id);
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;

    let supabaseQuery = this.supabase
      .from('risks')
      .select('*', { count: 'exact' });

    if (query.project_id) {
      supabaseQuery = supabaseQuery.eq('project_id', query.project_id);
    }

    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }

    if (query.probability) {
      supabaseQuery = supabaseQuery.eq('probability', query.probability);
    }

    if (query.impact) {
      supabaseQuery = supabaseQuery.eq('impact', query.impact);
    }

    const { data, count, error } = await supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to list risks: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to list risks');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data ?? []).map((row) => this.formatRisk(row)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    this.validateUuid(id);

    const { data, error } = await this.supabase
      .from('risks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error finding risk ${id}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Risk with ID '${id}' not found`);
    }

    return this.formatRisk(data);
  }

  async update(id: string, dto: UpdateRiskDto) {
    this.validateUuid(id);
    if (dto.owner_id) {
      this.validateUuid(dto.owner_id);
    }

    const existing = await this.findOne(id);

    const effectiveProbability = dto.probability ?? existing.probability;
    const effectiveImpact = dto.impact ?? existing.impact;

    const riskScore = this.calculateRiskScore(
      effectiveProbability as RiskProbability,
      effectiveImpact as RiskImpact,
    );

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      risk_score: riskScore,
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.probability !== undefined) updateData.probability = dto.probability;
    if (dto.impact !== undefined) updateData.impact = dto.impact;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.mitigation_plan !== undefined) updateData.mitigation_plan = dto.mitigation_plan;
    if (dto.owner_id !== undefined) updateData.owner_id = dto.owner_id;
    if (dto.due_date !== undefined) updateData.due_date = dto.due_date;

    const { data, error } = await this.supabase
      .from('risks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.logger.error(`Failed to update risk ${id}: ${error?.message}`);
      throw new BadRequestException(error?.message || 'Failed to update risk');
    }

    return this.formatRisk(data);
  }

  async remove(id: string) {
    this.validateUuid(id);

    await this.findOne(id);

    const { error } = await this.supabase
      .from('risks')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete risk ${id}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to delete risk');
    }

    return { message: 'Risk deleted successfully', id };
  }

  private validateUuid(id: string): void {
    if (!id || !UUID_REGEX.test(id)) {
      throw new BadRequestException(`Invalid UUID format: '${id}'`);
    }
  }

  private formatRisk(row: any) {
    if (!row) {
      throw new NotFoundException('Risk data not found');
    }
    return {
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      description: row.description ?? null,
      probability: row.probability,
      impact: row.impact,
      risk_score: row.risk_score,
      status: row.status,
      mitigation_plan: row.mitigation_plan ?? null,
      owner_id: row.owner_id ?? null,
      due_date: row.due_date ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
