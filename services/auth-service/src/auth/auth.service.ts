import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
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

export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  status: AccountStatus;
  deactivatedAt?: string | null;
  createdAt: string;
}

export const DESIGNATED_ADMIN_ID = '66544acc-4e3d-4b3b-b3f3-44971c6a9347';
export const DESIGNATED_ADMIN_EMAIL = 'admin.ansh@aipms.com';

export const SEEDED_USER_IDS = {
  ADMIN: 'a1111111-1111-4111-8111-111111111111',
  PM: 'b2222222-2222-4222-8222-222222222222',
  MEMBER: 'c3333333-3333-4333-8333-333333333333',
  VIEWER: 'd4444444-4444-4444-8444-444444444444',
} as const;

@Injectable()
export class AuthService {
  public static readonly DESIGNATED_ADMIN_ID = DESIGNATED_ADMIN_ID;
  public static readonly DESIGNATED_ADMIN_EMAIL = DESIGNATED_ADMIN_EMAIL;

  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private readonly supabaseServiceRoleKey: string;
  private supabase: SupabaseClient;
  private adminSupabase: SupabaseClient | null = null;

  // In-memory user role registry synchronized with auth flow
  private readonly usersMap = new Map<string, UserRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.supabaseUrl = this.configService.get<string>('supabase.url') ?? '';
    this.supabaseAnonKey =
      this.configService.get<string>('supabase.anonKey') ?? '';
    this.supabaseServiceRoleKey =
      this.configService.get<string>('supabase.serviceRoleKey') ?? '';

    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (this.supabaseUrl && this.supabaseServiceRoleKey) {
      try {
        this.adminSupabase = createClient(this.supabaseUrl, this.supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      } catch (err) {
        this.logger.warn(`Could not initialize admin Supabase client: ${(err as Error).message}`);
      }
    }

    // In production, never seed any users (must come from Supabase Auth).
    // In test environment, seed initial users for RBAC unit tests.
    // In development, strictly seed only the designated system administrator.
    if (process.env.NODE_ENV === 'production') {
      // No seeds in production
    } else if (process.env.NODE_ENV === 'test' && process.env.VITEST && !process.env.NODE_ENV?.includes('prod')) {
      this.seedInitialUsers();
    } else {
      this.seedDesignatedAdminOnly();
    }
  }

  private seedDesignatedAdminOnly() {
    const admin: UserRecord = {
      id: AuthService.DESIGNATED_ADMIN_ID,
      email: AuthService.DESIGNATED_ADMIN_EMAIL,
      name: 'Ansh (Designated Admin)',
      role: Role.ADMIN,
      status: 'ACTIVE',
      deactivatedAt: null,
      createdAt: '2026-09-25T00:00:00.000Z',
    };
    this.usersMap.set(admin.id, admin);
    this.usersMap.set(admin.email.toLowerCase(), admin);
  }

  private seedInitialUsers() {
    const seed: UserRecord[] = [
      {
        id: AuthService.DESIGNATED_ADMIN_ID,
        email: AuthService.DESIGNATED_ADMIN_EMAIL,
        name: 'Ansh',
        role: Role.ADMIN,
        status: 'ACTIVE',
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: SEEDED_USER_IDS.ADMIN,
        email: 'admin@aipms.com',
        name: 'System Admin',
        role: Role.ADMIN,
        status: 'ACTIVE',
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: SEEDED_USER_IDS.PM,
        email: 'pm@aipms.com',
        name: 'Alex Rivera (PM)',
        role: Role.PROJECT_MANAGER,
        status: 'ACTIVE',
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: SEEDED_USER_IDS.MEMBER,
        email: 'member@aipms.com',
        name: 'Sarah Chen (Dev)',
        role: Role.TEAM_MEMBER,
        status: 'ACTIVE',
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: SEEDED_USER_IDS.VIEWER,
        email: 'viewer@aipms.com',
        name: 'David Kim (Stakeholder)',
        role: Role.VIEWER,
        status: 'ACTIVE',
        deactivatedAt: null,
        createdAt: new Date().toISOString(),
      },
    ];

    seed.forEach((u) => {
      this.usersMap.set(u.id, u);
      this.usersMap.set(u.email.toLowerCase(), u);
    });

    // Provide backward-compatible aliases for legacy string IDs
    const aliasMap: Record<string, string> = {
      'admin-user-001': SEEDED_USER_IDS.ADMIN,
      'pm-user-002': SEEDED_USER_IDS.PM,
      'member-user-003': SEEDED_USER_IDS.MEMBER,
      'viewer-user-004': SEEDED_USER_IDS.VIEWER,
    };
    for (const [legacyId, uuid] of Object.entries(aliasMap)) {
      const rec = this.usersMap.get(uuid);
      if (rec) {
        this.usersMap.set(legacyId, rec);
      }
    }
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Ordinary registration strictly defaults to TEAM_MEMBER to prevent privilege escalation
    const assignedRole = Role.TEAM_MEMBER;

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
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

    if (this.adminSupabase) {
      try {
        await this.adminSupabase.auth.admin.updateUserById(data.user.id, {
          app_metadata: { role: assignedRole, status: 'ACTIVE' },
        });
      } catch (err) {
        this.logger.warn(`Could not persist default role to app_metadata on signup: ${(err as Error).message}`);
      }
    }

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? name,
      role: assignedRole,
      status: 'ACTIVE',
      deactivatedAt: null,
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

    // Account Status Enforcement:
    // Block authentication for deactivated accounts across app_metadata, Supabase ban, and local cache
    const statusInMeta = data.user.app_metadata?.status as AccountStatus | undefined;
    const isBanned = Boolean(
      (data.user as any).banned_until && new Date((data.user as any).banned_until) > new Date(),
    );
    const cachedUser = this.usersMap.get(data.user.id);
    const isDeactivated = statusInMeta === 'INACTIVE' || isBanned || cachedUser?.status === 'INACTIVE';

    if (isDeactivated) {
      this.logger.warn(`Login blocked for deactivated account: ${data.user.id} (${data.user.email})`);
      throw new UnauthorizedException('Account is deactivated. Please contact your system administrator.');
    }

    // Determine assigned role with precedence:
    // 1. Trusted app_metadata (production & dev)
    // 2. In non-production only: in-memory cache strictly matched by user ID (never cross-grant by email)
    // 3. Default to TEAM_MEMBER
    let assignedRole: Role = Role.TEAM_MEMBER;
    if (data.user.app_metadata?.role) {
      const candidateRole = data.user.app_metadata.role as Role;
      if (Object.values(Role).includes(candidateRole)) {
        if (candidateRole === Role.ADMIN) {
          const isDesignated =
            data.user.id === AuthService.DESIGNATED_ADMIN_ID &&
            (data.user.email ?? email).toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
          if (isDesignated) {
            assignedRole = Role.ADMIN;
          } else {
            this.logger.warn(
              `User ${data.user.id} (${data.user.email}) claimed ADMIN in app_metadata but is not designated admin. Failing safe to TEAM_MEMBER.`,
            );
            assignedRole = Role.TEAM_MEMBER;
          }
        } else {
          assignedRole = candidateRole;
        }
      }
    } else if (process.env.NODE_ENV !== 'production') {
      const existing = this.usersMap.get(data.user.id);
      if (existing && existing.id === data.user.id) {
        if (existing.role === Role.ADMIN) {
          const isDesignated =
            existing.id === AuthService.DESIGNATED_ADMIN_ID ||
            existing.id === 'admin-user-001';
          assignedRole = isDesignated ? Role.ADMIN : Role.TEAM_MEMBER;
        } else {
          assignedRole = existing.role;
        }
      }
    }

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? (cachedUser?.id === data.user.id ? cachedUser.name : null),
      role: assignedRole,
      status: 'ACTIVE',
      deactivatedAt: null,
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

    // Account Status Enforcement:
    // Block active requests for deactivated accounts immediately
    const statusInMeta = data.user.app_metadata?.status as AccountStatus | undefined;
    const isBanned = Boolean(
      (data.user as any).banned_until && new Date((data.user as any).banned_until) > new Date(),
    );
    const cachedUser = this.usersMap.get(data.user.id);
    const isDeactivated = statusInMeta === 'INACTIVE' || isBanned || cachedUser?.status === 'INACTIVE';

    if (isDeactivated) {
      this.logger.warn(`Session validation blocked for deactivated account: ${data.user.id} (${email})`);
      throw new UnauthorizedException('Account is deactivated. Please contact your system administrator.');
    }

    let assignedRole: Role = Role.TEAM_MEMBER;
    if (data.user.app_metadata?.role) {
      const candidateRole = data.user.app_metadata.role as Role;
      if (Object.values(Role).includes(candidateRole)) {
        if (candidateRole === Role.ADMIN) {
          const isDesignated =
            data.user.id === AuthService.DESIGNATED_ADMIN_ID &&
            email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
          if (isDesignated) {
            assignedRole = Role.ADMIN;
          } else {
            this.logger.warn(
              `User ${data.user.id} (${email}) claimed ADMIN in app_metadata but is not designated admin. Failing safe to TEAM_MEMBER.`,
            );
            assignedRole = Role.TEAM_MEMBER;
          }
        } else {
          assignedRole = candidateRole;
        }
      }
    } else if (process.env.NODE_ENV !== 'production') {
      const existing = this.usersMap.get(data.user.id);
      if (existing && existing.id === data.user.id) {
        if (existing.role === Role.ADMIN) {
          const isDesignated =
            existing.id === AuthService.DESIGNATED_ADMIN_ID ||
            existing.id === 'admin-user-001';
          assignedRole = isDesignated ? Role.ADMIN : Role.TEAM_MEMBER;
        } else {
          assignedRole = existing.role;
        }
      }
    }

    const userRecord: UserRecord = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? (cachedUser?.id === data.user.id ? cachedUser.name : null),
      role: assignedRole,
      status: 'ACTIVE',
      deactivatedAt: null,
      createdAt: data.user.created_at ?? new Date().toISOString(),
    };

    this.usersMap.set(userRecord.id, userRecord);

    return userRecord;
  }

  async listUsers() {
    if (this.adminSupabase) {
      try {
        const { data, error } = await this.adminSupabase.auth.admin.listUsers();
        if (!error && data?.users) {
          for (const u of data.users) {
            const rawRole = (u.app_metadata?.role as Role) || Role.TEAM_MEMBER;
            let role: Role = Role.TEAM_MEMBER;
            if (Object.values(Role).includes(rawRole)) {
              if (rawRole === Role.ADMIN) {
                const isDesignated =
                  u.id === AuthService.DESIGNATED_ADMIN_ID &&
                  (u.email ?? '').toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
                if (isDesignated) {
                  role = Role.ADMIN;
                } else if (
                  process.env.NODE_ENV !== 'production' &&
                  (u.id === 'admin-user-001' || u.id === 'admin-1')
                ) {
                  role = Role.ADMIN;
                } else {
                  this.logger.warn(
                    `User ${u.id} (${u.email}) claimed ADMIN in app_metadata during listUsers but is not designated admin. Sanitizing to TEAM_MEMBER.`,
                  );
                  role = Role.TEAM_MEMBER;
                }
              } else {
                role = rawRole;
              }
            }

            const isBanned = Boolean(
              (u as any).banned_until && new Date((u as any).banned_until) > new Date(),
            );
            const status: AccountStatus =
              (u.app_metadata?.status as AccountStatus) || (isBanned ? 'INACTIVE' : 'ACTIVE');
            const deactivatedAt = (u.app_metadata?.deactivated_at as string) || null;

            const record: UserRecord = {
              id: u.id,
              email: u.email ?? '',
              name: u.user_metadata?.name ?? null,
              role,
              status,
              deactivatedAt,
              createdAt: u.created_at,
            };
            this.usersMap.set(record.id, record);
            if (record.email) {
              this.usersMap.set(record.email.toLowerCase(), record);
            }
          }

          // Authoritative reconciliation: remove any users in memory that no longer exist in Supabase
          const authoritativeIds = new Set(data.users.map((u) => u.id));
          for (const [key, user] of Array.from(this.usersMap.entries())) {
            const isDesignated =
              user.id === AuthService.DESIGNATED_ADMIN_ID ||
              user.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();

            if (!isDesignated && !authoritativeIds.has(user.id)) {
              this.usersMap.delete(key);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Could not sync users from Supabase admin: ${(err as Error).message}`);
      }
    }
    const seen = new Set<string>();
    const uniqueUsers: UserRecord[] = [];
    for (const user of this.usersMap.values()) {
      if (user && user.id && !seen.has(user.id)) {
        seen.add(user.id);
        uniqueUsers.push(user);
      }
    }

    return uniqueUsers.map((user) => {
      let role = user.role;
      if (role === Role.ADMIN) {
        const isDesignated =
          user.id === AuthService.DESIGNATED_ADMIN_ID &&
          user.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
        if (
          !isDesignated &&
          !(
            process.env.NODE_ENV !== 'production' &&
            (user.id === SEEDED_USER_IDS.ADMIN || user.id === 'admin-user-001' || user.id === 'admin-1')
          )
        ) {
          role = Role.TEAM_MEMBER;
        }
      }
      return {
        ...user,
        role,
        status: user.status || 'ACTIVE',
        deactivatedAt: user.deactivatedAt ?? null,
      };
    });
  }

  async getDirectoryProfiles(): Promise<Array<{
    id: string;
    name: string | null;
    email: string;
    role: Role;
    status: AccountStatus;
    deactivatedAt: string | null;
  }>> {
    const users = await this.listUsers();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      deactivatedAt: u.deactivatedAt ?? null,
    }));
  }

  async updateUserRole(
    userId: string,
    newRole: Role,
    requesterRole: Role = Role.ADMIN,
    requesterId?: string,
    requesterEmail?: string,
  ) {
    if (requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Access Denied: Role '${requesterRole}' is not authorized to update user roles. Only administrators can perform this action.`,
      );
    }

    const validRoles = Object.values(Role);
    if (!newRole || !validRoles.includes(newRole)) {
      throw new BadRequestException(
        `Invalid role value '${newRole}'. Role must be one of ADMIN, PROJECT_MANAGER, TEAM_MEMBER, VIEWER`,
      );
    }
    let existing: UserRecord | undefined;

    // Check by user ID, alias, or email first in local map
    const cached = this.usersMap.get(userId) || this.usersMap.get(userId.toLowerCase());
    if (cached) {
      existing = cached;
    }

    // If user is not found in local cache (e.g. after service restart or in another replica), check Supabase
    if (!existing && this.adminSupabase) {
      try {
        const { data, error } = await this.adminSupabase.auth.admin.getUserById(userId);
        if (!error && data?.user) {
          const rawRole = (data.user.app_metadata?.role as Role) || Role.TEAM_MEMBER;
          let role: Role = Role.TEAM_MEMBER;
          if (Object.values(Role).includes(rawRole)) {
            if (rawRole === Role.ADMIN) {
              const isDesignated =
                data.user.id === AuthService.DESIGNATED_ADMIN_ID &&
                (data.user.email ?? '').toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
              role = isDesignated ? Role.ADMIN : Role.TEAM_MEMBER;
            } else {
              role = rawRole;
            }
          }
          const isBanned = Boolean(
            (data.user as any).banned_until && new Date((data.user as any).banned_until) > new Date(),
          );
          const status: AccountStatus =
            (data.user.app_metadata?.status as AccountStatus) || (isBanned ? 'INACTIVE' : 'ACTIVE');
          const deactivatedAt = (data.user.app_metadata?.deactivated_at as string) || null;

          const rec: UserRecord = {
            id: data.user.id,
            email: data.user.email ?? '',
            name: data.user.user_metadata?.name ?? null,
            role,
            status,
            deactivatedAt,
            createdAt: data.user.created_at,
          };
          existing = rec;
          this.usersMap.set(rec.id, rec);
        }
      } catch (err) {
        this.logger.warn(`Could not fetch user ${userId} from Supabase: ${(err as Error).message}`);
      }
    }

    // In non-production only, allow lookup of seeded demo user by exact ID or email
    if (!existing && process.env.NODE_ENV !== 'production') {
      const found = Array.from(this.usersMap.values()).find(
        (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase(),
      );
      if (found) {
        existing = found;
      }
    }

    if (!existing) {
      throw new BadRequestException(`User with ID '${userId}' not found`);
    }

    // Enforce Single System Administrator Rule:
    // 1. Only the designated administrator account (admin.ansh@aipms.com / 66544acc-4e3d-4b3b-b3f3-44971c6a9347)
    //    can be assigned the ADMIN role. Reject attempts to assign ADMIN to any other account.
    if (newRole === Role.ADMIN) {
      const isDesignatedAdmin =
        existing.id === AuthService.DESIGNATED_ADMIN_ID &&
        existing.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();

      if (!isDesignatedAdmin) {
        throw new ForbiddenException(
          `Access Denied: Role '${Role.ADMIN}' cannot be assigned. Only the designated system administrator (${AuthService.DESIGNATED_ADMIN_EMAIL}) is permitted to hold this role.`,
        );
      }
    }

    // 2. Prevent modifying or demoting the designated administrator account
    const isTargetDesignatedAdmin =
      existing.id === AuthService.DESIGNATED_ADMIN_ID ||
      existing.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();

    if (isTargetDesignatedAdmin && newRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access Denied: The designated system administrator account cannot be modified or demoted.',
      );
    }

    // Protect against accidental demotion of the last active administrator
    if (existing.role === Role.ADMIN && newRole !== Role.ADMIN) {
      throw new ForbiddenException('Access Denied: Cannot demote the designated active administrator.');
    }

    const previousRole = existing.role;

    // Persist role change durably to Supabase Auth app_metadata if admin client is configured
    if (this.adminSupabase) {
      const { error: updateError } = await this.adminSupabase.auth.admin.updateUserById(
        existing.id,
        {
          app_metadata: { role: newRole },
        },
      );

      if (updateError) {
        this.logger.error(
          `Failed to persist role change to Supabase app_metadata for user ${existing.id}: ${updateError.message}`,
        );
        throw new InternalServerErrorException(
          `Failed to persist role change securely: ${updateError.message}`,
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        'Administrative client is not configured; cannot persist role change securely in production',
      );
    }

    existing.role = newRole;
    this.usersMap.set(existing.id, existing);

    await this.auditService.recordEvent({
      actorId: requesterId ?? AuthService.DESIGNATED_ADMIN_ID,
      actorEmail: requesterEmail ?? AuthService.DESIGNATED_ADMIN_EMAIL,
      action: 'ROLE_ASSIGNED',
      targetResource: existing.id,
      previousValue: previousRole,
      newValue: newRole,
      outcome: 'SUCCESS',
      context: { userEmail: existing.email, userName: existing.name },
    });

    return existing;
  }

  async deactivateUser(
    userId: string,
    requesterRole: Role = Role.ADMIN,
    requesterId?: string,
    requesterEmail?: string,
  ): Promise<UserRecord> {
    if (requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Access Denied: Role '${requesterRole}' is not authorized to deactivate users. Only administrators can perform this action.`,
      );
    }

    const existing = await this.findUserByIdOrEmail(userId);
    if (!existing) {
      throw new BadRequestException(`User with ID '${userId}' not found`);
    }

    // 1. Designated administrator protection
    const isTargetDesignatedAdmin =
      existing.id === AuthService.DESIGNATED_ADMIN_ID ||
      existing.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();

    if (isTargetDesignatedAdmin) {
      throw new ForbiddenException(
        'Access Denied: The designated system administrator account cannot be deactivated.',
      );
    }

    // 2. Prevent self-deactivation
    const isSelf =
      (requesterId && existing.id === requesterId) ||
      (requesterEmail && existing.email.toLowerCase() === requesterEmail.toLowerCase());

    if (isSelf) {
      throw new ForbiddenException(
        'Access Denied: Administrators cannot deactivate their own account.',
      );
    }

    // 3. Check already deactivated
    if (existing.status === 'INACTIVE') {
      throw new ConflictException(
        `Account for '${existing.name || existing.email}' is already deactivated.`,
      );
    }

    // 4. Project Ownership Pre-condition: Check if user owns active/existing projects
    await this.assertUserDoesNotOwnProjects(existing, 'deactivate');

    const now = new Date().toISOString();

    // 5. Invalidate sessions and ban user in Supabase Auth
    if (this.adminSupabase) {
      const { error: banError } = await this.adminSupabase.auth.admin.updateUserById(
        existing.id,
        {
          ban_duration: '876000h',
          app_metadata: {
            role: existing.role,
            status: 'INACTIVE',
            deactivated_at: now,
          },
        },
      );

      if (banError) {
        this.logger.error(
          `Failed to deactivate user ${existing.id} in Supabase Auth: ${banError.message}`,
        );
        throw new InternalServerErrorException(
          `Failed to persist deactivation in identity provider: ${banError.message}`,
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        'Administrative client is not configured; cannot deactivate user securely in production',
      );
    }

    existing.status = 'INACTIVE';
    existing.deactivatedAt = now;
    this.usersMap.set(existing.id, existing);

    await this.auditService.recordEvent({
      actorId: requesterId ?? AuthService.DESIGNATED_ADMIN_ID,
      actorEmail: requesterEmail ?? AuthService.DESIGNATED_ADMIN_EMAIL,
      action: 'USER_DEACTIVATED',
      targetResource: existing.id,
      previousValue: 'ACTIVE',
      newValue: 'INACTIVE',
      outcome: 'SUCCESS',
      context: {
        userEmail: existing.email,
        userName: existing.name,
        role: existing.role,
        deactivatedAt: now,
      },
    });

    return existing;
  }

  async reactivateUser(
    userId: string,
    requesterRole: Role = Role.ADMIN,
    requesterId?: string,
    requesterEmail?: string,
  ): Promise<UserRecord> {
    if (requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Access Denied: Role '${requesterRole}' is not authorized to reactivate users. Only administrators can perform this action.`,
      );
    }

    const existing = await this.findUserByIdOrEmail(userId);
    if (!existing) {
      throw new BadRequestException(`User with ID '${userId}' not found`);
    }

    if (existing.status === 'ACTIVE') {
      throw new ConflictException(
        `Account for '${existing.name || existing.email}' is already active.`,
      );
    }

    // In Supabase Auth, remove ban and reset status to ACTIVE
    if (this.adminSupabase) {
      const { error: unbanError } = await this.adminSupabase.auth.admin.updateUserById(
        existing.id,
        {
          ban_duration: 'none',
          app_metadata: {
            role: existing.role,
            status: 'ACTIVE',
            deactivated_at: null,
          },
        },
      );

      if (unbanError) {
        this.logger.error(
          `Failed to reactivate user ${existing.id} in Supabase Auth: ${unbanError.message}`,
        );
        throw new InternalServerErrorException(
          `Failed to persist reactivation in identity provider: ${unbanError.message}`,
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        'Administrative client is not configured; cannot reactivate user securely in production',
      );
    }

    existing.status = 'ACTIVE';
    existing.deactivatedAt = null;
    this.usersMap.set(existing.id, existing);

    await this.auditService.recordEvent({
      actorId: requesterId ?? AuthService.DESIGNATED_ADMIN_ID,
      actorEmail: requesterEmail ?? AuthService.DESIGNATED_ADMIN_EMAIL,
      action: 'USER_REACTIVATED',
      targetResource: existing.id,
      previousValue: 'INACTIVE',
      newValue: 'ACTIVE',
      outcome: 'SUCCESS',
      context: {
        userEmail: existing.email,
        userName: existing.name,
        role: existing.role,
      },
    });

    return existing;
  }

  async deleteUser(
    userId: string,
    requesterRole: Role = Role.ADMIN,
    requesterId?: string,
    requesterEmail?: string,
  ): Promise<{ message: string; userId: string }> {
    if (requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Access Denied: Role '${requesterRole}' is not authorized to delete users. Only administrators can perform this action.`,
      );
    }

    const existing = await this.findUserByIdOrEmail(userId);
    if (!existing) {
      throw new BadRequestException(`User with ID '${userId}' not found`);
    }

    // 1. Designated administrator protection
    const isTargetDesignatedAdmin =
      existing.id === AuthService.DESIGNATED_ADMIN_ID ||
      existing.email.toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();

    if (isTargetDesignatedAdmin) {
      throw new ForbiddenException(
        'Access Denied: The designated system administrator account cannot be deleted.',
      );
    }

    // 2. Prevent self-deletion
    const isSelf =
      (requesterId && existing.id === requesterId) ||
      (requesterEmail && existing.email.toLowerCase() === requesterEmail.toLowerCase());

    if (isSelf) {
      throw new ForbiddenException(
        'Access Denied: Administrators cannot delete their own account.',
      );
    }

    // 3. Two-Step Deletion Process: Account must be deactivated first
    if (existing.status !== 'INACTIVE') {
      throw new BadRequestException(
        `Account for '${existing.name || existing.email}' must be deactivated before permanent deletion. Please deactivate the user first.`,
      );
    }

    // 4. Project Ownership Pre-condition: Check if user owns any projects
    await this.assertUserDoesNotOwnProjects(existing, 'delete');

    // 5. Relational cleanup preserving durable audit integrity and tasks
    const dbClient = this.adminSupabase;
    if (dbClient) {
      try {
        // Clean up project memberships
        await dbClient.from('project_members').delete().eq('user_id', existing.id);
        // Clean up team memberships
        await dbClient.from('team_members').delete().eq('user_id', existing.id);
        // Unassign active task assignments (preserve tasks, comments, and sprints)
        await dbClient.from('tasks').update({ assignee_id: null }).eq('assignee_id', existing.id);
      } catch (cleanupErr) {
        this.logger.warn(`Relational cleanup warning for user ${existing.id}: ${(cleanupErr as Error).message}`);
      }
    }

    // 6. Delete identity from Supabase Auth admin API
    if (this.adminSupabase) {
      const { error: delError } = await this.adminSupabase.auth.admin.deleteUser(existing.id);
      if (delError) {
        this.logger.error(`Failed to delete user ${existing.id} from Supabase Auth: ${delError.message}`);
        throw new InternalServerErrorException(`Failed to delete user account: ${delError.message}`);
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        'Administrative client is not configured; cannot permanently delete user in production',
      );
    }

    // 7. Remove from in-memory cache
    this.usersMap.delete(existing.id);
    if (existing.email) {
      this.usersMap.delete(existing.email.toLowerCase());
    }

    // 8. Record durable audit log (Audit history is preserved indefinitely)
    await this.auditService.recordEvent({
      actorId: requesterId ?? AuthService.DESIGNATED_ADMIN_ID,
      actorEmail: requesterEmail ?? AuthService.DESIGNATED_ADMIN_EMAIL,
      action: 'USER_DELETED',
      targetResource: existing.id,
      previousValue: existing.email,
      newValue: 'DELETED',
      outcome: 'SUCCESS',
      context: {
        userEmail: existing.email,
        userName: existing.name,
        role: existing.role,
        retainedAudit: true,
      },
    });

    return {
      message: `User account '${existing.email}' has been permanently deleted successfully.`,
      userId: existing.id,
    };
  }

  private async findUserByIdOrEmail(userId: string): Promise<UserRecord | undefined> {
    const cached = this.usersMap.get(userId) || this.usersMap.get(userId.toLowerCase());
    if (cached) {
      return cached;
    }

    if (this.adminSupabase) {
      try {
        const { data, error } = await this.adminSupabase.auth.admin.getUserById(userId);
        if (!error && data?.user) {
          const rawRole = (data.user.app_metadata?.role as Role) || Role.TEAM_MEMBER;
          let role: Role = Role.TEAM_MEMBER;
          if (Object.values(Role).includes(rawRole)) {
            if (rawRole === Role.ADMIN) {
              const isDesignated =
                data.user.id === AuthService.DESIGNATED_ADMIN_ID &&
                (data.user.email ?? '').toLowerCase() === AuthService.DESIGNATED_ADMIN_EMAIL.toLowerCase();
              role = isDesignated ? Role.ADMIN : Role.TEAM_MEMBER;
            } else {
              role = rawRole;
            }
          }
          const isBanned = Boolean(
            (data.user as any).banned_until && new Date((data.user as any).banned_until) > new Date(),
          );
          const status: AccountStatus =
            (data.user.app_metadata?.status as AccountStatus) || (isBanned ? 'INACTIVE' : 'ACTIVE');
          const deactivatedAt = (data.user.app_metadata?.deactivated_at as string) || null;

          const rec: UserRecord = {
            id: data.user.id,
            email: data.user.email ?? '',
            name: data.user.user_metadata?.name ?? null,
            role,
            status,
            deactivatedAt,
            createdAt: data.user.created_at,
          };
          this.usersMap.set(rec.id, rec);
          return rec;
        }
      } catch (err) {
        this.logger.warn(`Could not fetch user ${userId} from Supabase: ${(err as Error).message}`);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const found = Array.from(this.usersMap.values()).find(
        (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase(),
      );
      if (found) return found;
    }

    return undefined;
  }

  private async assertUserDoesNotOwnProjects(user: UserRecord, operation: 'deactivate' | 'delete'): Promise<void> {
    const dbClient = this.adminSupabase;
    if (!dbClient) return;

    try {
      const { data, error } = await dbClient
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id);

      if (!error && Array.isArray(data) && data.length > 0) {
        const projectNames = data.map((p: any) => p.name || p.id).join(', ');
        throw new ConflictException(
          `Cannot ${operation} user '${user.name || user.email}': User is the registered owner of ${data.length} project(s) [${projectNames}]. Project ownership must be transferred before account ${operation}.`,
        );
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Could not verify project ownership during ${operation}: ${(err as Error).message}`);
    }
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
