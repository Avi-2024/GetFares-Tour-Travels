import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const campaignsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/campaigns", params)),
  summary: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/campaigns/summary", params)),
  create: (payload: unknown) =>
    apiRequest("/api/campaigns", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/campaigns/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/campaigns/${id}`, { method: "PATCH", body: payload }),
  delete: (id: string) =>
    apiRequest(`/api/campaigns/${id}`, { method: "DELETE" }),
  duplicate: (id: string) =>
    apiRequest(`/api/campaigns/${id}/duplicate`, { method: "POST" }),
  validateDateRange: (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (end <= start) {
      throw new Error("End date must be after start date");
    }

    if (start < now && end < now) {
      throw new Error("Campaign dates cannot be in the past");
    }

    return true;
  },
  export: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/campaigns/export", params), {
      responseType: "blob",
    }),
};
