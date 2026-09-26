import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ProjectReportParamDto {
  @ApiPropertyOptional({
    description: 'Project UUID',
    example: '11111111-1111-4111-a111-111111111111',
  })
  @IsUUID('4')
  projectId: string;
}
