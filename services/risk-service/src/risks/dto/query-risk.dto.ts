import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RiskProbability } from '../enums/risk-probability.enum.js';
import { RiskImpact } from '../enums/risk-impact.enum.js';
import { RiskStatus } from '../enums/risk-status.enum.js';

export class QueryRiskDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter risks by project UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'project_id must be a valid UUID' })
  project_id?: string;

  @ApiPropertyOptional({ enum: RiskStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional({ enum: RiskProbability, description: 'Filter by probability' })
  @IsOptional()
  @IsEnum(RiskProbability)
  probability?: RiskProbability;

  @ApiPropertyOptional({ enum: RiskImpact, description: 'Filter by impact' })
  @IsOptional()
  @IsEnum(RiskImpact)
  impact?: RiskImpact;
}
