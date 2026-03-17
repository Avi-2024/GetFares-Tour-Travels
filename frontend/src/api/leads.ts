import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const leadsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/leads", params)),
  create: (payload: unknown) =>
    apiRequest("/api/leads", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/leads/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/leads/${id}`, { method: "PATCH", body: payload }),
  assign: (id: string, payload: unknown) =>
    apiRequest(`/api/leads/${id}/assign`, { method: "POST", body: payload }),
  addFollowup: (id: string, payload: unknown) =>
    apiRequest(`/api/leads/${id}/followups`, { method: "POST", body: payload }),
  getFollowups: (id: string) => apiRequest(`/api/leads/${id}/followups`),
  getTimeline: (id: string) => apiRequest(`/api/leads/${id}/timeline`),
  markAsLost: (id: string, reason: string, notes?: string) =>
    apiRequest(`/api/leads/${id}/lost`, {
      method: "POST",
      body: { reason, notes },
    }),
  checkDuplicate: (email?: string, phone?: string) =>
    apiRequest("/api/leads/check-duplicate", {
      method: "POST",
      body: { email, phone },
    }),
  getCampaigns: () => apiRequest("/api/campaigns/active"),
  getDestinations: () => apiRequest("/api/destinations"),
  distribute: () => apiRequest("/api/leads/distribute", { method: "POST" }),
  reassignInactive: () =>
    apiRequest("/api/leads/reassign-inactive", { method: "POST" }),
  processSlaBreaches: () =>
    apiRequest("/api/leads/sla/process-breaches", { method: "POST" }),
  getSlaStatus: (id: string) => apiRequest(`/api/leads/${id}/sla-status`),
  publicCapture: (payload: unknown) =>
    apiRequest("/api/leads/public-capture", { method: "POST", body: payload }),
};
