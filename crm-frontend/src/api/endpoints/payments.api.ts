import { apiClient, withQuery } from '../core';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  createdAt: string;
}

export const paymentsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Payment[] }>(withQuery('/api/payments', params)),
  stats: () => apiClient.get('/api/payments/stats'),
  create: (payload: { bookingId: string; amount: number; method: string; reference?: string }) =>
    apiClient.post<{ data: Payment }>('/api/payments', payload),
  getById: (id: string) => apiClient.get<{ data: Payment }>(`/api/payments/${id}`),
  update: (id: string, payload: any) => apiClient.patch(`/api/payments/${id}`, payload),
  verify: (id: string, verified: boolean, notes?: string) =>
    apiClient.post(`/api/payments/${id}/verify`, { verified, notes }),
};
