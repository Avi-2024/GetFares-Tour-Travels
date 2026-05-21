/**
 * Users Service
 * Business logic layer for user management
 */

import { usersEndpoints, type User, type CreateUserPayload, type UpdateUserPayload } from '../endpoints/users.api';
import { isValidPhoneDigits, PHONE_DIGITS_RANGE_ERROR } from '../../utils/phoneValidation';

export class UsersService {
  async list(params?: {
    page?: number;
    limit?: number;
    role?: string;
    active?: boolean;
    search?: string;
  }) {
    const response = await usersEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateUserPayload) {
    // Validate email
    if (!this.isValidEmail(payload.email)) {
      throw new Error('Invalid email address');
    }

    // Validate phone
    if (payload.phone && !isValidPhoneDigits(payload.phone)) {
      throw new Error(PHONE_DIGITS_RANGE_ERROR);
    }

    // Validate role
    if (!payload.role && !payload.roleId) {
      throw new Error('Role is required');
    }

    const response = await usersEndpoints.create(payload);
    return response.data;
  }

  async update(id: string, payload: UpdateUserPayload) {
    // Validate email if provided
    if (payload.email && !this.isValidEmail(payload.email)) {
      throw new Error('Invalid email address');
    }

    const response = await usersEndpoints.update(id, payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await usersEndpoints.getById(id);
    return response.data;
  }

  async toggleActive(id: string, active: boolean) {
    await this.update(id, { active });
  }

  // Helper methods
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getStatusBadge(active?: boolean): { text: string; color: string } {
    return active
      ? { text: 'Active', color: 'green' }
      : { text: 'Inactive', color: 'red' };
  }

  getRoleColor(role?: string): string {
    const roleMap: Record<string, string> = {
      ADMIN: 'purple',
      MANAGER: 'blue',
      AGENT: 'green',
      CONSULTANT: 'green',
      EXECUTIVE: 'yellow',
    };
    return roleMap[role?.toUpperCase() || ''] || 'gray';
  }

  formatUserName(user: User): string {
    return user.fullName || user.email;
  }

  getUserInitials(user: User): string {
    const name = user.fullName || user.email;
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  filterByRole(users: User[], role: string): User[] {
    return users.filter(u => u.role?.toLowerCase() === role.toLowerCase());
  }

  filterActive(users: User[]): User[] {
    return users.filter(u => u.active !== false);
  }

  sortByName(users: User[]): User[] {
    return [...users].sort((a, b) => 
      this.formatUserName(a).localeCompare(this.formatUserName(b))
    );
  }
}

export const usersService = new UsersService();
