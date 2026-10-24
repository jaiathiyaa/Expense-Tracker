import { API_CONFIG } from '../api/config';
import {
  RegisterPayload,
  RegisterResponse,
  LoginPayload,
  LoginResponse,
  MeResponse,
  ApiError,
  ApiErrorResponse,
} from '../api/types';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        (data as ApiErrorResponse)?.error ||
        (data as ApiErrorResponse)?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection.', 408);
    }

    // Network error (e.g. server offline or unreachable host)
    throw new ApiError(
      error.message || 'Unable to connect to the server. Please verify your connection.',
      0
    );
  }
}

export const authService = {
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return request<RegisterResponse>(API_CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return request<LoginResponse>(API_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  async getMe(token: string): Promise<MeResponse> {
    return request<MeResponse>(API_CONFIG.ENDPOINTS.ME, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateProfile(
    token: string,
    payload: { name: string; email?: string }
  ): Promise<{ message: string; user: any }> {
    return request<{ message: string; user: any }>(API_CONFIG.ENDPOINTS.PROFILE, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
      }),
    });
  },

  async changePassword(
    token: string,
    payload: { currentPassword: string; newPassword: string }
  ): Promise<{ message: string }> {
    return request<{ message: string }>(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  async deleteAccount(
    token: string,
    payload: { password: string }
  ): Promise<{ message: string }> {
    return request<{ message: string }>(API_CONFIG.ENDPOINTS.DELETE_ACCOUNT, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },
};
