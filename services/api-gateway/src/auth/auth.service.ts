import {
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ??
      'http://localhost:3001';
    this.authServiceUrl = rawUrl.replace(/\/+$/, '');
  }

  async register(registerDto: RegisterDto) {
    return this.forwardRequest('/api/auth/register', {
      method: 'POST',
      body: registerDto,
    });
  }

  async login(loginDto: LoginDto) {
    return this.forwardRequest('/api/auth/login', {
      method: 'POST',
      body: loginDto,
    });
  }

  async getCurrentUser(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    return this.forwardRequest('/api/auth/me', {
      method: 'GET',
      headers,
    });
  }

  async logout(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    return this.forwardRequest('/api/auth/logout', {
      method: 'POST',
      headers,
    });
  }

  private async forwardRequest(
    endpoint: string,
    options: {
      method: string;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ) {
    const url = `${this.authServiceUrl}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: requestHeaders,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(5000),
      });

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        throw new HttpException(
          data || { message: response.statusText },
          response.status,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Failed to communicate with Auth Service at ${url}: ${(error as Error).message}`,
      );

      if (
        (error as Error).name === 'TimeoutError' ||
        (error as Error).name === 'AbortError'
      ) {
        throw new GatewayTimeoutException('Auth service request timed out');
      }

      throw new ServiceUnavailableException(
        'Auth service is currently unavailable',
      );
    }
  }
}
