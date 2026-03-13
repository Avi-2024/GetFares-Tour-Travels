import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const complaintsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/complaints", params)),
  create: (payload: unknown) => apiRequest("/api/complaints", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/complaints/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/complaints/${id}`, { method: "PATCH", body: payload }),
  listActivities: (id: string) => apiRequest(`/api/complaints/${id}/activities`),
  addActivity: (id: string, payload: unknown) => apiRequest(`/api/complaints/${id}/activities`, { method: "POST", body: payload }),
};
