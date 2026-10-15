import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered user email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'http://localhost:3008',
    description: 'Frontend origin URL for reset redirect',
    required: false,
  })
  @IsOptional()
  @IsString()
  origin?: string;
}
