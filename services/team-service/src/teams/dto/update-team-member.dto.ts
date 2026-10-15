import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TeamRole } from '../enums/team-role.enum.js';

export class UpdateTeamMemberDto {
  @ApiProperty({
    enum: TeamRole,
    example: TeamRole.TEAM_LEAD,
    description: 'Updated role of the member in the team',
  })
  @IsEnum(TeamRole, {
    message: 'Role must be either TEAM_LEAD or MEMBER',
  })
  @IsNotEmpty({ message: 'role is required' })
  role!: TeamRole;
}
