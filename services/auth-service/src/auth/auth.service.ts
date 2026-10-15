import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Role } from './roles.enum.js';
import { AuditService } from '../audit/audit.service.js';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private supabase: SupabaseClient;

  // In-memory user role registry synchronized with auth flow
  private readonly usersMap = new Map<string, UserRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.supabaseUrl = this.configService.get<string>('supabase.url') ?? '';
    this.supabaseAnonKey =
      this.configService.get<string>('supabase.anonKey') ?? '';

    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Seed initial system users for RBAC testing
    this.seedInitialUsers();
  }

  private seedInitialUsers() {
    const seed: UserRecord[] = [
      {
        id: 'admin-user-001',
        email: 'admin@aipms.com',
        name: 'System Admin',
        role: Role.ADMIN,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pm-user-002',
        email: 'pm@aipms.com',
        name: 'Alex Rivera (PM)',
        role: Role.PROJECT_MANAGER,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'member-user-003',
        email: 'member@aipms.com',
        name: 'Sarah Chen (Dev)',
        role: Role.TEAM_MEMBER,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'viewer-user-004',
        email: 'viewer@aipms.com',
        name: 'David Kim (Stakeholder)',
        role: Role.VIEWER,
        createdAt: new Date().toISOString(),
      },
    ];

    seed.forEach((u) => this.usersMap.set(u.id, u));
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Default admin detection or requested role or TEAM_MEMBER
    const assignedRole =
      email.toLowerCase() === 'admin@aipms.com' || email.toLowerCase() === 'ak@gmail.com'
        ? Role.ADMIN
        : Role.TEAM_MEMBER;

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: assignedRole },
      },
    });

    if (error) {
      this.logger.error(`Registration failed for ${email}: ${error.message}`);

      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        error.status === 422
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw new BadRequestException(
        error.message || 'User registration failed',
      );
    }

    if (!data.user) {
      throw new BadRequestException('User registration failed');
    }

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? name,
      role: assignedRole,
      createdAt: data.user.created_at ?? new Date().toISOString(),
    };

    this.usersMap.set(userRecord.id, userRecord);

    return {
      message: 'Registration successful',
      user: userRecord,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      this.logger.warn(`Login failed for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Determine assigned role with precedence: existing stored record > user_metadata > admin check > default
    const existing = Array.from(this.usersMap.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    const assignedRole: Role =
      existing?.role ||
      (data.user.user_metadata?.role as Role) ||
      (email.toLowerCase() === 'admin@aipms.com' || email.toLowerCase() === 'ak@gmail.com'
        ? Role.ADMIN
        : Role.TEAM_MEMBER);

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? existing?.name ?? null,
      role: assignedRole,
      createdAt: data.user.created_at ?? new Date().toISOString(),
    };

    this.usersMap.set(userRecord.id, userRecord);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: userRecord,
    };
  }

  async getCurrentUser(token: string) {
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      this.logger.warn(`Token validation failed: ${error?.message}`);
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const email = data.user.email ?? '';
    const existing = Array.from(this.usersMap.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    const assignedRole: Role =
      existing?.role ||
      (data.user.user_metadata?.role as Role) ||
      (email.toLowerCase() === 'admin@aipms.com' || email.toLowerCase() === 'ak@gmail.com'
        ? Role.ADMIN
        : Role.TEAM_MEMBER);

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? existing?.name ?? null,
      role: assignedRole,
      createdAt: data.user.created_at ?? new Date().toISOString(),
    };

    this.usersMap.set(userRecord.id, userRecord);

    return userRecord;
  }

  async listUsers() {
    return Array.from(this.usersMap.values());
  }

  async updateUserRole(userId: string, newRole: Role) {
    const validRoles = Object.values(Role);
    if (!newRole || !validRoles.includes(newRole)) {
      throw new BadRequestException(
        `Invalid role value '${newRole}'. Role must be one of ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER`,
      );
    }
    let existing = this.usersMap.get(userId);

    if (!existing) {
      existing = Array.from(this.usersMap.values()).find(
        (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase(),
      );
    }

    if (!existing) {
      throw new BadRequestException(`User with ID '${userId}' not found`);
    }

    // Protect against accidental demotion of the last active administrator
    if (existing.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const activeAdmins = Array.from(new Set(Array.from(this.usersMap.values()))).filter(
        (u) => u.role === Role.ADMIN,
      );

      if (activeAdmins.length <= 1) {
        throw new BadRequestException('Cannot demote the last active administrator');
      }
    }

    const previousRole = existing.role;
    existing.role = newRole;
    this.usersMap.set(existing.id, existing);
    if (existing.email) {
      this.usersMap.set(existing.email.toLowerCase(), existing);
    }

    await this.auditService.recordEvent({
      actorId: 'admin-user-001',
      actorEmail: 'admin@aipms.com',
      action: 'ROLE_ASSIGNED',
      targetResource: existing.id,
      previousValue: previousRole,
      newValue: newRole,
      outcome: 'SUCCESS',
      context: { userEmail: existing.email, userName: existing.name },
    });

    return existing;
  }

  async getAuditLogs(options?: {
    action?: string;
    actorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.auditService.queryLogs(options);
  }

  async logout(token: string) {
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    const client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await client.auth.signOut();

    if (error) {
      this.logger.warn(`Logout warning: ${error.message}`);
    }

    return {
      message: 'Logout successful',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, originHeader?: string) {
    const { email } = dto;
    const origin = dto.origin || originHeader || 'http://localhost:3008';
    const redirectTo = `${origin.replace(/\/+$/, '')}/reset-password`;

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      this.logger.warn(`Password reset request error for ${email}: ${error.message}`);
    }

    await this.auditService.recordEvent({
      actorId: 'anonymous',
      actorEmail: email,
      action: 'PASSWORD_RESET_REQUESTED',
      targetResource: email,
      outcome: 'SUCCESS',
      context: { email, redirectTo },
    });

    return {
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { accessToken, password } = dto;
    if (!accessToken) {
      throw new UnauthorizedException('Password recovery token is required');
    }

    const res = await fetch(`${this.supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as Record<string, string>;
      this.logger.error(`Password reset error: ${errData.msg || errData.message}`);
      throw new BadRequestException(errData.msg || errData.message || 'Password reset token is invalid or expired');
    }

    const userData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const userEmail = (userData.email as string) || 'unknown';
    const userId = (userData.id as string) || 'unknown';

    await this.auditService.recordEvent({
      actorId: userId,
      actorEmail: userEmail,
      action: 'PASSWORD_RESET_COMPLETED',
      targetResource: userId,
      outcome: 'SUCCESS',
      context: { email: userEmail },
    });

    return {
      message: 'Password has been successfully updated. You may now sign in with your new password.',
    };
  }

  async changePassword(token: string, dto: ChangePasswordDto) {
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    const { currentPassword, newPassword } = dto;
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password cannot be identical to your current password');
    }

    // 1. Authenticate user to obtain email
    const user = await this.getCurrentUser(token);
    if (!user || !user.email) {
      throw new UnauthorizedException('Invalid user session');
    }

    // 2. Validate current password against identity provider
    const { data: signInData, error: verifyError } = await this.supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError || !signInData.session) {
      this.logger.warn(`Change password verification failed for ${user.email}: ${verifyError?.message}`);
      throw new BadRequestException('Current password does not match');
    }

    const sessionToken = signInData.session.access_token || token;

    // 3. Update password via Supabase REST API using the authenticated user session token
    const res = await fetch(`${this.supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: this.supabaseAnonKey,
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as Record<string, string>;
      this.logger.error(`Password update error for ${user.email}: ${errData.msg || errData.message}`);
      throw new BadRequestException(errData.msg || errData.message || 'Failed to update password');
    }

    await this.auditService.recordEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'PASSWORD_CHANGED',
      targetResource: user.id,
      outcome: 'SUCCESS',
      context: { userEmail: user.email },
    });

    return {
      message: 'Password successfully updated.',
    };
  }
}
