import { apiClient, withQuery } from "../core";

export interface Campaign {
  id: string;
  name: string;
  source?: string;
  budget?: number;
  actualSpend?: number;
  leadsGenerated?: number;
  revenueGenerated?: number;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface CreateCampaignPayload {
  name: string;
  source?: string;
  budget?: number;
  actualSpend?: number;
  leadsGenerated?: number;
  revenueGenerated?: number;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate?: string;
  endDate?: string;
}

export const campaignsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Campaign[] }>(withQuery("/api/campaigns", params)),

  create: (payload: CreateCampaignPayload) =>
    apiClient.post<{ data: Campaign }>("/api/campaigns", payload),

  getById: (id: string) =>
    apiClient.get<{ data: Campaign }>(`/api/campaigns/${id}`),

  update: (id: string, payload: Partial<CreateCampaignPayload>) =>
    apiClient.patch<{ data: Campaign }>(`/api/campaigns/${id}`, payload),

  delete: (id: string) => apiClient.delete<{ data: { id: string } }>(`/api/campaigns/${id}`),

  duplicate: (id: string) =>
    apiClient.post<{ data: Campaign }>(`/api/campaigns/${id}/duplicate`),
};
