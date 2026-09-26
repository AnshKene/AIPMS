import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSprintDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Project UUID this sprint belongs to',
  })
  @IsUUID('4', { message: 'project_id must be a valid UUID' })
  @IsNotEmpty({ message: 'project_id is required' })
  project_id!: string;

  @ApiProperty({
    example: 'Sprint 1',
    description: 'Sprint name',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Sprint name is required' })
  @MaxLength(255, { message: 'Sprint name must not exceed 255 characters' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Implement authentication and project management',
    description: 'Sprint goal',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({
    example: '2026-10-01T00:00:00Z',
    description: 'Sprint start date (ISO 8601)',
  })
  @IsDateString({}, { message: 'start_date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'start_date is required' })
  start_date!: string;

  @ApiProperty({
    example: '2026-10-14T23:59:59Z',
    description: 'Sprint end date (ISO 8601)',
  })
  @IsDateString({}, { message: 'end_date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'end_date is required' })
  end_date!: string;
}
