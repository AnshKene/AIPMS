import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSprintDto {
  @ApiPropertyOptional({
    example: 'Sprint 1 - Updated',
    description: 'Updated sprint name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Sprint name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated sprint goal description',
    description: 'Updated sprint goal',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00Z',
    description: 'Updated sprint start date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'start_date must be a valid ISO date string' })
  start_date?: string;

  @ApiPropertyOptional({
    example: '2026-10-14T23:59:59Z',
    description: 'Updated sprint end date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'end_date must be a valid ISO date string' })
  end_date?: string;
}
