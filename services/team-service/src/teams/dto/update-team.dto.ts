import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional({
    example: 'Frontend Development Team',
    description: 'Updated team name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Team name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description for frontend engineering team',
    description: 'Updated team description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
