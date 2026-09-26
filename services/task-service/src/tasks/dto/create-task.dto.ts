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
import { TaskStatus } from '../enums/task-status.enum.js';
import { TaskPriority } from '../enums/task-priority.enum.js';

export class CreateTaskDto {
  @ApiProperty({
    example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab',
    description: 'Project UUID this task belongs to',
  })
  @IsUUID('4', { message: 'projectId must be a valid UUID' })
  @IsNotEmpty({ message: 'projectId is required' })
  projectId!: string;

  @ApiProperty({
    example: 'Implement login UI',
    description: 'Task title',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  @MaxLength(255, { message: 'Task title must not exceed 255 characters' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Build the login form with email/password fields',
    description: 'Task description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.TODO,
    description: 'Initial task status',
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus, {
    message: 'Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED',
  })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    description: 'Task priority',
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT',
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Assignee Supabase Auth user UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assigneeId must be a valid UUID' })
  assigneeId?: string;

  @ApiPropertyOptional({
    example: 'e1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Associated team UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'teamId must be a valid UUID' })
  teamId?: string;

  @ApiPropertyOptional({
    example: '2026-09-26T00:00:00.000Z',
    description: 'Task start date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-15T00:00:00.000Z',
    description: 'Task due date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string;
}
