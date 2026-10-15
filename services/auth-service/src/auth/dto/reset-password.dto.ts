import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'new-secure-password',
    description: 'New password for the user (at least 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5...',
    description: 'Recovery access token obtained from the reset link',
  })
  @IsString()
  @IsNotEmpty({ message: 'Recovery token is required' })
  accessToken!: string;
}
