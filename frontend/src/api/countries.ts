import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export type CountryRecord = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  usage?: {
    usersCount?: number;
    leadsCount?: number;
  };
};

export type CountryListQuery = {
  includeInactive?: boolean;
  search?: string;
};

export type CountryPayload = {
  code: string;
  name: string;
  isActive?: boolean;
};

export const countriesApi = {
  list: (query?: CountryListQuery) =>
    apiRequest<{ data: CountryRecord[] }>(withQuery("/api/countries", query)),

  getById: (id: string, includeUsage = false) =>
    apiRequest<{ data: CountryRecord }>(
      withQuery(`/api/countries/${id}`, { includeUsage }),
    ),

  create: (payload: CountryPayload) =>
    apiRequest<{ data: CountryRecord }>("/api/countries", {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: Partial<CountryPayload>) =>
    apiRequest<{ data: CountryRecord }>(`/api/countries/${id}`, {
      method: "PATCH",
      body: payload,
    }),
};

