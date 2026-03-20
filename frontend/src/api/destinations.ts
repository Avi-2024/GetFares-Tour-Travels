import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export type DestinationRecord = {
  id: string;
  name: string;
  country?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
  currentPricing?: DestinationPricingRecord | null;
};

export type DestinationPricingRecord = {
  id: string;
  destinationId: string;
  baseCost: number;
  minProfitPercent: number;
  recommendedProfitPercent?: number | null;
  taxPercent?: number;
  validFrom?: string | null;
  validTo?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
};

export type DestinationListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export type DestinationPayload = {
  name: string;
  country?: string;
  isActive?: boolean;
};

export type DestinationPricingPayload = {
  baseCost: number;
  minProfitPercent: number;
  recommendedProfitPercent?: number;
  taxPercent?: number;
  validFrom?: string;
  validTo?: string;
};

export const destinationsApi = {
  list: (query?: DestinationListQuery) =>
    apiRequest<{ data: DestinationRecord[] }>(withQuery("/api/destinations", query)),

  getById: (id: string) =>
    apiRequest<{ data: DestinationRecord & { pricing?: DestinationPricingRecord[] } }>(
      `/api/destinations/${id}`,
    ),

  create: (payload: DestinationPayload) =>
    apiRequest<{ data: DestinationRecord }>("/api/destinations", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<DestinationPayload>) =>
    apiRequest<{ data: DestinationRecord }>(`/api/destinations/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  listPricing: (destinationId: string) =>
    apiRequest<{ data: DestinationPricingRecord[] }>(
      `/api/destinations/${destinationId}/pricing`,
    ),

  createPricing: (destinationId: string, payload: DestinationPricingPayload) =>
    apiRequest<{ data: DestinationPricingRecord }>(
      `/api/destinations/${destinationId}/pricing`,
      {
        method: "POST",
        body: payload,
      },
    ),

  updatePricing: (
    pricingId: string,
    payload: Partial<DestinationPricingPayload>,
  ) =>
    apiRequest<{ data: DestinationPricingRecord }>(
      `/api/destinations/pricing/${pricingId}`,
      {
        method: "PATCH",
        body: payload,
      },
    ),
};
