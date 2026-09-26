import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddTaskDependencyDto {
  @ApiProperty({
    example: 'f0a1b2c3-4567-89ab-cdef-0123456789ab',
    description: 'UUID of the task that this task depends on',
  })
  @IsUUID('4', { message: 'dependsOnTaskId must be a valid UUID' })
  @IsNotEmpty({ message: 'dependsOnTaskId is required' })
  dependsOnTaskId!: string;
}
