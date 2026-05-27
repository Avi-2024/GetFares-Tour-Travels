import { apiRequest } from "./apiClient";

type LoginResponse = {
  data: {
    accessToken?: string;
    user: {
      id: string;
      email: string;
      fullName?: string;
      name?: string;
      role?: string;
      roleId?: string;
      active?: boolean | null;
      isActive?: boolean;
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
    roleCountry?: string | null;
    agentCountry?: string | null;
    country?: string | null;
    agentType?: string | null;
    active?: boolean | null;
    isActive?: boolean;
  };
};

export const authApi = {
  login: (payload: { email: string; password: string; rememberMe?: boolean }) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),
  logout: () =>
    apiRequest<{ data: { success: boolean } }>("/api/auth/logout", {
      method: "POST",
    }),
  profile: () =>
    apiRequest<ProfileResponse>(`/api/auth/me?ts=${Date.now()}`, {
      skipUnauthorizedRedirect: true,
    }),
  toggleActive: (active: boolean) =>
    apiRequest<ProfileResponse>("/api/auth/toggle-active", {
      method: "POST",
      body: { active },
    }),
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
    apiRequest<{ data: { roleId?: string; role?: string; permissions: string[] } }>(
      "/api/rbac/me/permissions",
    ),
  assignRole: (payload: { userId: string; role?: string; roleId?: string }) =>
    apiRequest("/api/rbac/assign", { method: "POST", body: payload }),
  listPermissions: () =>
    apiRequest<{
      data: { id: string; key: string; description?: string | null; isActive?: boolean }[];
    }>("/api/permissions"),
  listRoles: () =>
    apiRequest<{
      data: { id: string; name: string; description?: string | null; country?: string | null; isActive?: boolean }[];
    }>("/api/roles"),
  updateRole: (roleId: string, payload: { country?: string | null }) =>
    apiRequest<{ data: { id: string; name: string; country?: string | null } }>(
      `/api/roles/${roleId}`,
      { method: "PATCH", body: payload },
    ),
  getRolePermissionsById: (roleId: string) =>
    apiRequest<{ data: string[] }>(`/api/roles/${roleId}/permissions`),
  updateRolePermissions: (
    roleId: string,
    payload: {
      replace?: boolean;
      permissionIds?: string[];
      permissions?: { permissionId?: string; key?: string; enabled?: boolean }[];
    },
  ) =>
    apiRequest<{ data: { roleId: string; role: string; permissions: string[] } }>(
      `/api/roles/${roleId}/permissions`,
      { method: "PATCH", body: payload },
    ),
  getRolePermissions: (role: string) =>
    apiRequest<{ data: string[] }>(`/api/rbac/roles/${role}/permissions`),
  setRolePermissions: (role: string, payload: { permissions: string[] }) =>
    apiRequest<{ data: { role: string; permissions: string[] } }>(
      `/api/rbac/roles/${role}/permissions`,
      {
        method: "PUT",
        body: payload,
      }, 
    ),
};
