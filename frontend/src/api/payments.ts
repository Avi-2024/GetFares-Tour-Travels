import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const paymentsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/payments", params)),
  create: (payload: unknown) => apiRequest("/api/payments", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/payments/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/payments/${id}`, { method: "PATCH", body: payload }),
  verify: (id: string, payload: unknown) => apiRequest(`/api/payments/${id}/verify`, { method: "POST", body: payload }),
};
