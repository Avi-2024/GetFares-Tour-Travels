import { apiClient, withQuery } from "../core";

export interface Campaign {
  id: string;
  name: string;
  country?: string;
  source?: string;
  budget?: number;
  actualSpend?: number;
  leadsGenerated?: number;
  revenueGenerated?: number;
  revenueCurrency?: string;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface CreateCampaignPayload {
  name: string;
  country?: string;
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

export interface CampaignSummary {
  campaignsCount: number;
  budget: number;
  actualSpend: number;
  leadsGenerated: number;
  revenueGenerated: number;
  revenueCurrency?: string;
}

export const campaignsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Campaign[] }>(withQuery("/api/campaigns", params)),

  summary: (params?: Record<string, any>) =>
    apiClient.get<{ data: CampaignSummary }>(withQuery("/api/campaigns/summary", params)),

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
