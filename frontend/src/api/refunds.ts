import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const refundsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/refunds", params)),
  create: (payload: unknown) =>
    apiRequest("/api/refunds", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/refunds/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/refunds/${id}`, { method: "PATCH", body: payload }),
  approve: (id: string, payload?: unknown) =>
    apiRequest(`/api/refunds/${id}/approve`, { method: "POST", body: payload }),
  reject: (id: string, payload?: unknown) =>
    apiRequest(`/api/refunds/${id}/reject`, { method: "POST", body: payload }),
  process: (id: string, payload?: unknown) =>
    apiRequest(`/api/refunds/${id}/process`, { method: "POST", body: payload }),
};
