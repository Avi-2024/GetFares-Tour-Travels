import { apiClient, withQuery } from '../core';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  country?: string;
  role?: string;
  roleId?: string;
  active?: boolean;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  phone: string;
  country: string;
  role?: string;
  roleId?: string;
  password?: string;
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  phone?: string;
  country?: string;
  role?: string;
  roleId?: string;
  active?: boolean;
}

export const usersEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: User[] }>(withQuery('/api/users', params)),

  create: (payload: CreateUserPayload) =>
    apiClient.post<{ data: User }>('/api/users', payload),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<{ data: User }>(`/api/users/${id}`, payload),

  getById: (id: string) =>
    apiClient.get<{ data: User }>(`/api/users/${id}`),
};
