import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SimulationScenarioType {
  MOVE_OVERDUE_TO_NEXT_SPRINT = 'MOVE_OVERDUE_TO_NEXT_SPRINT',
  MOVE_TASKS_TO_NEXT_SPRINT = 'MOVE_TASKS_TO_NEXT_SPRINT',
  RESOLVE_HIGH_RISKS = 'RESOLVE_HIGH_RISKS',
  EXTEND_SPRINT_DEADLINE = 'EXTEND_SPRINT_DEADLINE',
  REASSIGN_WORKLOAD = 'REASSIGN_WORKLOAD',
  CUSTOM = 'CUSTOM',
}

export class SimulationRequestDto {
  @ApiProperty({
    description: 'Pre-defined or custom simulation scenario',
    enum: SimulationScenarioType,
    example: SimulationScenarioType.MOVE_OVERDUE_TO_NEXT_SPRINT,
  })
  @IsEnum(SimulationScenarioType)
  scenario!: SimulationScenarioType;

  @ApiPropertyOptional({
    description: 'Specific task UUIDs to move or simulate',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiPropertyOptional({
    description: 'Specific risk UUIDs to simulate resolving',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskIds?: string[];

  @ApiPropertyOptional({
    description: 'Days to extend active sprint deadline',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  extendDays?: number;

  @ApiPropertyOptional({
    description: 'Target team member or assignee UUID for workload balancing simulation',
  })
  @IsOptional()
  @IsString()
  targetAssigneeId?: string;

  @ApiPropertyOptional({
    description: 'Custom scenario description text for LLM interpretation',
  })
  @IsOptional()
  @IsString()
  customDescription?: string;
}

export class NaturalLanguageQueryDto {
  @ApiProperty({
    description: 'Natural language question regarding project state, blockers, risks, workload, or sprint delivery',
    example: 'What are the main dependency bottlenecks threatening our active sprint?',
  })
  @IsString()
  query!: string;
}
