import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab',
    description: 'Associated project UUID',
  })
  @IsUUID('4', { message: 'projectId must be a valid UUID' })
  @IsNotEmpty({ message: 'projectId is required' })
  projectId!: string;

  @ApiProperty({
    example: 'Development Team',
    description: 'Team name',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Team name is required' })
  @MaxLength(255, { message: 'Team name must not exceed 255 characters' })
  name!: string;

  @ApiPropertyOptional({
    example: 'AIPMS core development engineering team',
    description: 'Team description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
