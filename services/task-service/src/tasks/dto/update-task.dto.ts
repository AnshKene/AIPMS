import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum.js';
import { TaskPriority } from '../enums/task-priority.enum.js';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Updated task title',
    description: 'Updated task title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Task title must not exceed 255 characters' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated task description',
    description: 'Updated task description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    description: 'Updated task status',
  })
  @IsOptional()
  @IsEnum(TaskStatus, {
    message: 'Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED',
  })
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    description: 'Updated task priority',
  })
  @IsOptional()
  @IsEnum(TaskPriority, {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT',
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Updated assignee UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'assigneeId must be a valid UUID' })
  assigneeId?: string;

  @ApiPropertyOptional({
    example: 'e1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Updated team UUID',
  })
  @IsOptional()
  @IsUUID('4', { message: 'teamId must be a valid UUID' })
  teamId?: string;

  @ApiPropertyOptional({
    example: '2026-09-26T00:00:00.000Z',
    description: 'Updated start date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-20T00:00:00.000Z',
    description: 'Updated due date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string;
}
