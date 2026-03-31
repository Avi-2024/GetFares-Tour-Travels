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
  data?: { roleId?: string; role?: string; permissions?: string[] };
  permissions?: string[];
};

export type PermissionRecord = {
  id: string;
  key: string;
  description?: string | null;
  isActive?: boolean;
};

export type RoleRecord = {
  id: string;
  name: string;
  description?: string | null;
  country?: string | null;
  isActive?: boolean;
};

export type StringListResponse = {
  data?: string[];
};

export type PermissionCatalogResponse = {
  data?: PermissionRecord[];
};

export type RolesResponse = {
  data?: RoleRecord[];
};

export type CreateRolePayload = {
  name: string;
  description?: string;
  country?: string | null;
};

export type CreateRoleResponse = {
  data?: RoleRecord;
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
  assignRole: (payload: { userId: string; role?: string; roleId?: string }) =>
    client.post("/api/rbac/assign", payload),
  listPermissions: () =>
    client.get<PermissionCatalogResponse>("/api/permissions"),
  listRoles: () => client.get<RolesResponse>("/api/roles"),
  createRole: (payload: CreateRolePayload) =>
    client.post<CreateRoleResponse>("/api/roles", payload),
  getRolePermissions: (role: string) =>
    client.get<StringListResponse>(`/api/rbac/roles/${role}/permissions`),
  getRolePermissionsById: (roleId: string) =>
    client.get<StringListResponse>(`/api/roles/${roleId}/permissions`),
  updateRolePermissions: (
    roleId: string,
    payload: {
      replace?: boolean;
      permissionIds?: string[];
      permissions?: { permissionId?: string; key?: string; enabled?: boolean }[];
    },
  ) => client.patch(`/api/roles/${roleId}/permissions`, payload),
  setRolePermissions: (role: string, payload: { permissions: string[] }) =>
    client.put(`/api/rbac/roles/${role}/permissions`, payload),
  updateRole: (
    roleId: string,
    payload: {
      name?: string;
      description?: string | null;
      country?: string | null;
      isActive?: boolean;
    },
  ) =>
    client.patch<{ data?: RoleRecord }>(`/api/roles/${roleId}`, payload),
});

export type AuthDatasource = ReturnType<typeof createAuthDatasource>;
