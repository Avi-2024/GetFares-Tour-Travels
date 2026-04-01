/**
 * Destinations API
 * Handles destination and pricing operations
 */

import { apiClient, withQuery } from '../core';

export interface Destination {
  id: string;
  name: string;
  country?: string | null;
  isActive?: boolean;
  createdAt?: string;
  currentPricing?: DestinationPricing | null;
}

export interface DestinationPricing {
  id: string;
  destinationId: string;
  baseCost: number;
  minProfitPercent: number;
  recommendedProfitPercent?: number | null;
  taxPercent?: number;
  validFrom?: string | null;
  validTo?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

export interface CreateDestinationPayload {
  name: string;
  country?: string;
  isActive?: boolean;
}

export interface CreatePricingPayload {
  baseCost: number;
  minProfitPercent: number;
  recommendedProfitPercent?: number;
  taxPercent?: number;
  validFrom?: string;
  validTo?: string;
}

export const destinationsEndpoints = {
  list: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) =>
    apiClient.get<{ data: Destination[] }>(withQuery('/api/destinations', params)),

  getById: (id: string) =>
    apiClient.get<{ data: Destination & { pricing?: DestinationPricing[] } }>(
      `/api/destinations/${id}`
    ),

  create: (payload: CreateDestinationPayload) =>
    apiClient.post<{ data: Destination }>('/api/destinations', payload),

  update: (id: string, payload: Partial<CreateDestinationPayload>) =>
    apiClient.patch<{ data: Destination }>(`/api/destinations/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<{ data: Destination }>(`/api/destinations/${id}`),

  listPricing: (destinationId: string) =>
    apiClient.get<{ data: DestinationPricing[] }>(
      `/api/destinations/${destinationId}/pricing`
    ),

  createPricing: (destinationId: string, payload: CreatePricingPayload) =>
    apiClient.post<{ data: DestinationPricing }>(
      `/api/destinations/${destinationId}/pricing`,
      payload
    ),

  updatePricing: (pricingId: string, payload: Partial<CreatePricingPayload>) =>
    apiClient.patch<{ data: DestinationPricing }>(
      `/api/destinations/pricing/${pricingId}`,
      payload
    ),
};
