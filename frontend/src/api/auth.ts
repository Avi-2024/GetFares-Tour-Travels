import { apiRequest } from "./apiClient";

type LoginResponse = {
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName?: string;
      name?: string;
      role?: string;
      roleId?: string;
    };
  };
};

type ProfileResponse = {
  data: {
    id: string;
    email: string;
    fullName?: string;
    name?: string;
    role?: string;
    roleId?: string;
  };
};

export const authApi = {
  login: (payload: { email: string; password: string; rememberMe?: boolean }) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),
  profile: () =>
    apiRequest<ProfileResponse>(`/api/auth/me?ts=${Date.now()}`),
  forgotPassword: (payload: { email: string }) =>
    apiRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: payload,
    }),
  resetPassword: (payload: { token: string; password: string }) =>
    apiRequest<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: payload,
    }),
};

export const rbacApi = {
  myPermissions: () =>
    apiRequest<{ data: { permissions: string[] } }>("/api/rbac/me/permissions"),
  assignRole: (payload: { userId: string; role: string }) =>
    apiRequest("/api/rbac/assign", { method: "POST", body: payload }),
};
