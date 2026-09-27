/**
 * AIPMS Reusable API Client
 * Single entry point communicating exclusively with the API Gateway.
 */

import { authStorage } from '@/lib/auth/auth-storage';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string,
  ) {
    super(message || `API Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const errObj = data as Record<string, unknown>;
    if (typeof errObj.message === 'string' && errObj.message.trim().length > 0) {
      return errObj.message;
    }
    if (Array.isArray(errObj.message) && errObj.message.length > 0) {
      return errObj.message.join(', ');
    }
    if (typeof errObj.error === 'string' && errObj.error.trim().length > 0) {
      return errObj.error;
    }
  }
  return fallback;
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, token, ...customConfig } = options;

  let url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers with bearer token support
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  // Handle Authorization header
  if (token !== undefined) {
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    } else {
      requestHeaders.delete('Authorization');
    }
  } else if (!requestHeaders.has('Authorization') && !requestHeaders.has('authorization')) {
    // Automatically attach stored token if available in browser context
    const storedToken = authStorage.getToken();
    if (storedToken) {
      requestHeaders.set('Authorization', `Bearer ${storedToken}`);
    }
  }

  const config: RequestInit = {
    method: 'GET',
    headers: requestHeaders,
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    if (!response.ok) {
      const message = parseErrorMessage(data, response.statusText);
      throw new ApiError(response.status, data, message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error connecting to API Gateway: ${(error as Error).message}`);
  }
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
