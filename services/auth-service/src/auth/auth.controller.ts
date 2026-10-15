import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Post,
  UnauthorizedException,
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
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
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return session' })
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of the currently authenticated user' })
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
  async me(@Headers('authorization') authHeader?: string) {
    const token = this.extractToken(authHeader);
    return this.authService.getCurrentUser(token);
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered system users' })
  async listUsers() {
    return this.authService.listUsers();
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user role' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.authService.updateUserRole(id, dto.role);
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query system audit logs' })
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getAuditLogs({
      action,
      actorId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current user session' })
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
  async logout(@Headers('authorization') authHeader?: string) {
    const token = this.extractToken(authHeader);
    return this.authService.logout(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password recovery instructions to email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset request dispatched successfully',
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
  @ApiOperation({ summary: 'Reset user password using recovery access token' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
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
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password successfully updated.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Current password incorrect or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Headers('authorization') authHeader: string | undefined,
    @Body() dto: ChangePasswordDto,
  ) {
    const token = this.extractToken(authHeader);
    return this.authService.changePassword(token, dto);
  }

  private extractToken(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header with Bearer token is required',
      );
    }
    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Token missing from Authorization header');
    }
    return token;
  }
}
