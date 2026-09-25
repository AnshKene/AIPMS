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
import { ProjectStatus } from '../enums/project-status.enum.js';

export class CreateProjectDto {
  @ApiProperty({
    example: 'AIPMS',
    description: 'Project name',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  name!: string;

  @ApiPropertyOptional({
    example: 'AI-Based Project Management System',
    description: 'Project description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    example: ProjectStatus.PLANNING,
    description: 'Initial project status',
    default: ProjectStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, {
    message:
      'Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED',
  })
  status?: ProjectStatus;

  @ApiPropertyOptional({
    example: '2026-09-25T00:00:00.000Z',
    description: 'Project start date (ISO string)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31T00:00:00.000Z',
    description: 'Project end date (ISO string)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;

  @ApiProperty({
    example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab',
    description: 'Owner user ID (UUID from Supabase Auth)',
  })
  @IsUUID('4', { message: 'ownerId must be a valid UUID' })
  @IsNotEmpty({ message: 'ownerId is required' })
  ownerId!: string;
}
