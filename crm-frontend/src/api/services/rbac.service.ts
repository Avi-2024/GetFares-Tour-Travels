/**
 * RBAC Service
 * Business logic layer for role-based access control
 */

import { rbacEndpoints, type Permission } from '../endpoints/rbac.api';

export class RbacService {
  private cachedPermissions: string[] | null = null;

  async getMyPermissions() {
    const response = await rbacEndpoints.getMyPermissions();
    this.cachedPermissions = response.data.permissions;
    localStorage.setItem('auth_permissions', JSON.stringify(response.data.permissions));
    return response.data;
  }

  async assignRole(userId: string, roleId?: string, role?: string) {
    await rbacEndpoints.assignRole(userId, roleId, role);
  }

  async listPermissions() {
    const response = await rbacEndpoints.listPermissions();
    return response.data;
  }

  async listRoles() {
    const response = await rbacEndpoints.listRoles();
    return response.data;
  }

  async updateRole(roleId: string, country?: string | null) {
    const response = await rbacEndpoints.updateRole(roleId, country);
    return response.data;
  }

  async getRolePermissions(roleId: string) {
    const response = await rbacEndpoints.getRolePermissions(roleId);
    return response.data;
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    const response = await rbacEndpoints.updateRolePermissions(roleId, permissionIds);
    return response.data;
  }

  // Helper methods
  hasPermission(permission: string): boolean {
    if (!this.cachedPermissions) {
      const stored = localStorage.getItem('auth_permissions');
      if (stored) {
        try {
          this.cachedPermissions = JSON.parse(stored);
        } catch {
          return false;
        }
      } else {
        return false;
      }
    }
    return this.cachedPermissions?.includes(permission) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  canCreate(resource: string): boolean {
    return this.hasPermission(`${resource}:create`);
  }

  canRead(resource: string): boolean {
    return this.hasPermission(`${resource}:read`);
  }

  canUpdate(resource: string): boolean {
    return this.hasPermission(`${resource}:update`);
  }

  canDelete(resource: string): boolean {
    return this.hasPermission(`${resource}:delete`);
  }

  getRoleColor(role: string): string {
    const roleMap: Record<string, string> = {
      ADMIN: 'purple',
      SUPER_ADMIN: 'red',
      MANAGER: 'blue',
      AGENT: 'green',
      CONSULTANT: 'green',
      EXECUTIVE: 'yellow',
      ACCOUNTS: 'orange',
      MARKETING: 'pink',
    };
    return roleMap[role.toUpperCase()] || 'gray';
  }

  groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
    const grouped: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      const module = permission.key.split(':')[0];
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    });

    return grouped;
  }

  getPermissionAction(permissionKey: string): string {
    const parts = permissionKey.split(':');
    return parts[parts.length - 1];
  }

  getPermissionModule(permissionKey: string): string {
    return permissionKey.split(':')[0];
  }

  formatPermissionLabel(permissionKey: string): string {
    const parts = permissionKey.split(':');
    return parts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' - ');
  }

  clearCache() {
    this.cachedPermissions = null;
    localStorage.removeItem('auth_permissions');
  }
}

export const rbacService = new RbacService();
