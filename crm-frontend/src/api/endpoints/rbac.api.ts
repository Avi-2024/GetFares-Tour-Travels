import { apiClient } from '../core';

export interface Permission {
  id: string;
  key: string;
  description?: string | null;
  isActive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  country?: string | null;
  isActive?: boolean;
}

export const rbacEndpoints = {
  getMyPermissions: () =>
    apiClient.get<{ data: { roleId?: string; role?: string; permissions: string[] } }>(
      '/api/rbac/me/permissions'
    ),

  assignRole: (userId: string, roleId?: string, role?: string) =>
    apiClient.post('/api/rbac/assign', { userId, roleId, role }),

  listPermissions: () =>
    apiClient.get<{ data: Permission[] }>('/api/permissions'),

  listRoles: () =>
    apiClient.get<{ data: Role[] }>('/api/roles'),

  updateRole: (roleId: string, country?: string | null) =>
    apiClient.patch<{ data: Role }>(`/api/roles/${roleId}`, { country }),

  getRolePermissions: (roleId: string) =>
    apiClient.get<{ data: string[] }>(`/api/roles/${roleId}/permissions`),

  updateRolePermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.patch<{ data: { roleId: string; permissions: string[] } }>(
      `/api/roles/${roleId}/permissions`,
      { replace: true, permissionIds }
    ),
};
