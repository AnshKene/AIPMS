import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum.js';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'AIPMS Phase 2',
    description: 'Updated project name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated project description',
    description: 'Updated project description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
    description: 'Updated project status',
  })
  @IsOptional()
  @IsEnum(ProjectStatus, {
    message:
      'Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED',
  })
  status?: ProjectStatus;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Updated start date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2027-01-31T00:00:00.000Z',
    description: 'Updated end date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;
}
