import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RiskProbability } from '../enums/risk-probability.enum.js';
import { RiskImpact } from '../enums/risk-impact.enum.js';
import { RiskStatus } from '../enums/risk-status.enum.js';

export class UpdateRiskDto {
  @ApiPropertyOptional({
    example: 'Database Migration Delay - Updated',
    description: 'Updated title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated risk description',
    description: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: RiskProbability,
    example: RiskProbability.HIGH,
    description: 'Updated probability',
  })
  @IsOptional()
  @IsEnum(RiskProbability, {
    message: 'probability must be one of: LOW, MEDIUM, HIGH',
  })
  probability?: RiskProbability;

  @ApiPropertyOptional({
    enum: RiskImpact,
    example: RiskImpact.MEDIUM,
    description: 'Updated impact',
  })
  @IsOptional()
  @IsEnum(RiskImpact, {
    message: 'impact must be one of: LOW, MEDIUM, HIGH',
  })
  impact?: RiskImpact;

  @ApiPropertyOptional({
    enum: RiskStatus,
    example: RiskStatus.MITIGATING,
    description: 'Updated status',
  })
  @IsOptional()
  @IsEnum(RiskStatus, {
    message: 'status must be one of: OPEN, MITIGATING, RESOLVED, ACCEPTED, CLOSED',
  })
  status?: RiskStatus;

  @ApiPropertyOptional({
    example: 'Updated mitigation plan',
    description: 'Updated mitigation plan',
  })
  @IsOptional()
  @IsString()
  mitigation_plan?: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Updated owner user UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'owner_id must be a valid UUID' })
  owner_id?: string;

  @ApiPropertyOptional({
    example: '2026-10-30T00:00:00Z',
    description: 'Updated due date (ISO 8601 string)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'due_date must be a valid ISO date string' })
  due_date?: string;
}
