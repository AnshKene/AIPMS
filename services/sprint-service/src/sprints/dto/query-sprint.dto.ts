import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SprintStatus } from '../enums/sprint-status.enum.js';

export class QuerySprintDto {
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

  @ApiPropertyOptional({ description: 'Filter sprints by project UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'project_id must be a valid UUID' })
  project_id?: string;

  @ApiPropertyOptional({ enum: SprintStatus, description: 'Filter by sprint status' })
  @IsOptional()
  @IsEnum(SprintStatus, {
    message: 'status must be one of: PLANNED, ACTIVE, COMPLETED, CANCELLED',
  })
  status?: SprintStatus;
}
