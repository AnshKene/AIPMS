import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { RiskProbability } from '../enums/risk-probability.enum.js';
import { RiskImpact } from '../enums/risk-impact.enum.js';
import { RiskStatus } from '../enums/risk-status.enum.js';

export class CreateRiskDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Project UUID this risk belongs to',
  })
  @IsUUID('4', { message: 'project_id must be a valid UUID' })
  @IsNotEmpty({ message: 'project_id is required' })
  project_id!: string;

  @ApiProperty({
    example: 'Database Migration Delay',
    description: 'Risk title',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Migration might take longer than scheduled due to data size',
    description: 'Risk description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: RiskProbability,
    example: RiskProbability.MEDIUM,
    description: 'Risk probability (LOW = 1, MEDIUM = 2, HIGH = 3)',
  })
  @IsEnum(RiskProbability, {
    message: 'probability must be one of: LOW, MEDIUM, HIGH',
  })
  @IsNotEmpty({ message: 'probability is required' })
  probability!: RiskProbability;

  @ApiProperty({
    enum: RiskImpact,
    example: RiskImpact.HIGH,
    description: 'Risk impact (LOW = 1, MEDIUM = 2, HIGH = 3)',
  })
  @IsEnum(RiskImpact, {
    message: 'impact must be one of: LOW, MEDIUM, HIGH',
  })
  @IsNotEmpty({ message: 'impact is required' })
  impact!: RiskImpact;

  @ApiPropertyOptional({
    enum: RiskStatus,
    example: RiskStatus.OPEN,
    description: 'Initial risk status (defaults to OPEN)',
    default: RiskStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(RiskStatus, {
    message: 'status must be one of: OPEN, MITIGATING, RESOLVED, ACCEPTED, CLOSED',
  })
  status?: RiskStatus;

  @ApiPropertyOptional({
    example: 'Perform dry run migration in staging environment ahead of time',
    description: 'Mitigation plan text',
  })
  @IsOptional()
  @IsString()
  mitigation_plan?: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Owner user UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'owner_id must be a valid UUID' })
  owner_id?: string;

  @ApiPropertyOptional({
    example: '2026-10-15T00:00:00Z',
    description: 'Due date (ISO 8601 string)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'due_date must be a valid ISO date string' })
  due_date?: string;
}
