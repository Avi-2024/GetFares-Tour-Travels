import type { HttpClient } from "../api/apiClient";

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type AuthUserDto = {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role?: string;
  roleId?: string;
};

export type LoginResponse = {
  data: {
    accessToken: string;
    user: AuthUserDto;
  };
};

export type PermissionsResponse = {
  data?: { permissions?: string[] };
  permissions?: string[];
};

export const createAuthDatasource = (client: HttpClient) => ({
  login: (payload: LoginPayload) =>
    client.post<LoginResponse>("/api/auth/login", payload),
  forgotPassword: (payload: { email: string }) =>
    client.post<{ message: string }>("/api/auth/forgot-password", payload),
  resetPassword: (payload: { token: string; password: string }) =>
    client.post<{ message: string }>("/api/auth/reset-password", payload),
  myPermissions: () =>
    client.get<PermissionsResponse>("/api/rbac/me/permissions"),
  assignRole: (payload: { userId: string; role: string }) =>
    client.post("/api/rbac/assign", payload),
});

export type AuthDatasource = ReturnType<typeof createAuthDatasource>;
