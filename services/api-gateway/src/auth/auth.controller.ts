import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/roles.enum.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Forward user registration request to Auth Service' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Registration successful' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'Example User' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation Error' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Auth service offline' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forward user login request to Auth Service' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5...' },
        refreshToken: { type: 'string', example: 'v1.Mr89...' },
        expiresAt: { type: 'number', example: 1700000000 },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'Example User' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation Error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Auth service offline' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forward current user request with Authorization Bearer header' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'd0a1b2c3-4567-89ab-cdef-0123456789ab' },
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'Example User' },
        createdAt: { type: 'string', example: '2026-09-25T20:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Auth service offline' })
  async me(@Headers('authorization') authHeader?: string) {
    return this.authService.getCurrentUser(authHeader);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all system users (ADMIN only)' })
  async listUsers(@Headers('authorization') authHeader?: string) {
    return this.authService.listUsers(authHeader);
  }

  @Patch('users/:id/role')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.authService.updateUserRole(id, dto.role, authHeader);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forward logout request with Authorization Bearer header' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Auth service offline' })
  async logout(@Headers('authorization') authHeader?: string) {
    return this.authService.logout(authHeader);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forward forgot password request to Auth Service' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email requested',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If an account exists with this email address, password reset instructions have been dispatched.' },
      },
    },
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Headers('origin') origin?: string,
  ) {
    return this.authService.forgotPassword(dto, origin);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forward reset password request with recovery token to Auth Service' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password has been successfully updated.' },
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forward change password request to Auth Service' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password successfully updated.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error or current password does not match' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.authService.changePassword(dto, authHeader);
  }
}
