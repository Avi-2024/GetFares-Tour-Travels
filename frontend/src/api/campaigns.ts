import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const campaignsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/campaigns", params)),
  create: (payload: unknown) => apiRequest("/api/campaigns", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/campaigns/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/campaigns/${id}`, { method: "PATCH", body: payload }),
};
