import { apiClient } from './client';

export interface ForgotPasswordRequest {
  email: string;
  origin?: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  accessToken: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export const authApi = {
  forgotPassword: async (email: string, origin?: string): Promise<ForgotPasswordResponse> => {
    return apiClient.post<ForgotPasswordResponse>(
      'auth/forgot-password',
      { email, origin },
      { token: null },
    );
  },

  resetPassword: async (req: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    return apiClient.post<ResetPasswordResponse>(
      'auth/reset-password',
      req,
      { token: null },
    );
  },

  changePassword: async (req: ChangePasswordRequest, token: string): Promise<ChangePasswordResponse> => {
    return apiClient.post<ChangePasswordResponse>(
      'auth/change-password',
      req,
      { token },
    );
  },

  deactivateUser: async (userId: string, token?: string | null) => {
    return apiClient.post<{ id: string; status: string; deactivatedAt: string }>(
      `auth/users/${userId}/deactivate`,
      {},
      { token },
    );
  },

  reactivateUser: async (userId: string, token?: string | null) => {
    return apiClient.post<{ id: string; status: string }>(
      `auth/users/${userId}/reactivate`,
      {},
      { token },
    );
  },

  deleteUser: async (userId: string, token?: string | null) => {
    return apiClient.delete<{ message: string; userId: string }>(
      `auth/users/${userId}`,
      { token },
    );
  },

  getDirectory: async (token?: string | null) => {
    return apiClient.get<Array<{
      id: string;
      name: string | null;
      email: string;
      role?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      deactivatedAt?: string | null;
      avatarUrl?: string;
    }>>('auth/directory', { token });
  },

  listUsers: async (token?: string | null) => {
    return apiClient.get<Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      status?: 'ACTIVE' | 'INACTIVE';
      deactivatedAt?: string | null;
    }>>('auth/users', { token });
  },
};
