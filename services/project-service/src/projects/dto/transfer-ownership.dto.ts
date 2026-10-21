import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    example: 'a1b2c3d4-5678-40ab-b123-1234567890ab',
    description: 'UUID of the new project owner (from Supabase Auth)',
  })
  @IsNotEmpty({ message: 'newOwnerId is required' })
  @IsUUID('4', { message: 'newOwnerId must be a valid UUID' })
  newOwnerId!: string;
}
