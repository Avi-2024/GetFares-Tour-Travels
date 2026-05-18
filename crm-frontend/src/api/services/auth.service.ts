/**
 * Auth Service
 * Business logic layer for authentication
 */

import { authEndpoints, type UserProfile } from '../endpoints/auth.api';

export class AuthService {
  async login(email: string, password: string, rememberMe = false) {
    const response = await authEndpoints.login({ email, password, rememberMe });

    localStorage.setItem('auth_user', JSON.stringify(response.data.user));

    return response.data;
  }

  async getProfile() {
    const response = await authEndpoints.getProfile();
    localStorage.setItem('auth_user', JSON.stringify(response.data));
    return response.data;
  }

  async logout() {
    try {
      await authEndpoints.logout();
    } catch {
      // Ignore logout API errors during cleanup
    }
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_permissions');
    window.location.href = '/login';
  }

  getCurrentUser(): UserProfile | null {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  async toggleActive(active: boolean) {
    const response = await authEndpoints.toggleActive(active);
    localStorage.setItem('auth_user', JSON.stringify(response.data));
    return response.data;
  }

  async forgotPassword(email: string) {
    return await authEndpoints.forgotPassword(email);
  }

  async resetPassword(token: string, password: string) {
    return await authEndpoints.resetPassword(token, password);
  }
}

export const authService = new AuthService();
