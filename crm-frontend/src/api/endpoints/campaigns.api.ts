/**
 * Campaigns API
 * Handles marketing campaign operations
 */

import { apiClient, withQuery } from '../core';

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  budget?: number;
  leadsGenerated?: number;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  budget?: number;
  description?: string;
}

export const campaignsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Campaign[] }>(withQuery('/api/campaigns', params)),

  create: (payload: CreateCampaignPayload) =>
    apiClient.post<{ data: Campaign }>('/api/campaigns', payload),

  getById: (id: string) =>
    apiClient.get<{ data: Campaign }>(`/api/campaigns/${id}`),

  update: (id: string, payload: Partial<CreateCampaignPayload>) =>
    apiClient.patch<{ data: Campaign }>(`/api/campaigns/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/api/campaigns/${id}`),

  duplicate: (id: string) =>
    apiClient.post<{ data: Campaign }>(`/api/campaigns/${id}/duplicate`),

  export: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/campaigns/export', params), { responseType: 'blob' }),
};
