import { apiRequest } from "./apiClient";

export const authApi = {
  login: (payload: { email: string; password: string; rememberMe?: boolean }) => apiRequest<{ token: string; user: { id: string; name: string } }>("/api/auth/login", { method: "POST", body: payload }),
  forgotPassword: (payload: { email: string }) => apiRequest<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload: { token: string; password: string }) => apiRequest<{ message: string }>("/api/auth/reset-password", { method: "POST", body: payload }),
};

export const rbacApi = {
  myPermissions: () => apiRequest<{ permissions: string[] }>("/api/rbac/me/permissions"),
};
