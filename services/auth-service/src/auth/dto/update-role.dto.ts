import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../roles.enum.js';

export class UpdateRoleDto {
  @ApiProperty({
    example: 'PROJECT_MANAGER',
    enum: Role,
    description: 'New system role to assign to user',
  })
  @IsEnum(Role, { message: 'Role must be one of ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: Role;
}
