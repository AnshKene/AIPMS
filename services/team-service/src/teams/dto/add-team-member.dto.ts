import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { TeamRole } from '../enums/team-role.enum.js';

export class AddTeamMemberDto {
  @ApiProperty({
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Supabase Auth user UUID',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiPropertyOptional({
    enum: TeamRole,
    example: TeamRole.MEMBER,
    description: 'Role of the member in the team',
    default: TeamRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(TeamRole, {
    message: 'Role must be either TEAM_LEAD or MEMBER',
  })
  role?: TeamRole = TeamRole.MEMBER;
}
