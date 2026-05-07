import { apiClient } from '../core';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName?: string;
      role?: string;
      roleId?: string;
      active?: boolean;
    };
  };
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  roleId?: string;
  country?: string | null;
  active?: boolean;
}

export const authEndpoints = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/api/auth/login', payload, { skipAuth: true }),

  getProfile: () =>
    apiClient.get<{ data: UserProfile }>(`/api/auth/me?ts=${Date.now()}`),

  toggleActive: (active: boolean) =>
    apiClient.post<{ data: UserProfile }>('/api/auth/toggle-active', { active }),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<{ message: string }>('/api/auth/reset-password', { token, password }),
};
