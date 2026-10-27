import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMemberRole } from '../enums/project-member-role.enum.js';

export class AddProjectMemberDto {
  @ApiProperty({
    description: 'UUID of the user to assign to the project',
    example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Role of the member in the project',
    enum: ProjectMemberRole,
    default: ProjectMemberRole.PROJECT_MANAGER,
  })
  @IsEnum(ProjectMemberRole, {
    message: 'Role must be PROJECT_MANAGER, MEMBER, or VIEWER',
  })
  @IsOptional()
  role?: ProjectMemberRole;
}
