import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController (API Gateway)', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call authService.register', async () => {
    const dto = { email: 'user@example.com', password: 'password123', name: 'User' };
    const expected = { message: 'Registration successful' };
    mockAuthService.register.mockResolvedValue(expected);

    const result = await controller.register(dto);
    expect(service.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should call authService.login', async () => {
    const dto = { email: 'user@example.com', password: 'password123' };
    const expected = { accessToken: 'token123' };
    mockAuthService.login.mockResolvedValue(expected);

    const result = await controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should call authService.getCurrentUser', async () => {
    const tokenHeader = 'Bearer token123';
    const expected = { id: '123', email: 'user@example.com' };
    mockAuthService.getCurrentUser.mockResolvedValue(expected);

    const result = await controller.me(tokenHeader);
    expect(service.getCurrentUser).toHaveBeenCalledWith(tokenHeader);
    expect(result).toEqual(expected);
  });

  it('should call authService.logout', async () => {
    const tokenHeader = 'Bearer token123';
    const expected = { message: 'Logout successful' };
    mockAuthService.logout.mockResolvedValue(expected);

    const result = await controller.logout(tokenHeader);
    expect(service.logout).toHaveBeenCalledWith(tokenHeader);
    expect(result).toEqual(expected);
  });
});
