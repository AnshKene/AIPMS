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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('supabase.url') ?? '';
    this.supabaseAnonKey =
      this.configService.get<string>('supabase.anonKey') ?? '';

    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

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

    return {
      message: 'Registration successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? name,
      },
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

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? null,
      },
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

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? null,
      createdAt: data.user.created_at,
    };
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
}
