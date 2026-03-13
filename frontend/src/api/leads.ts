import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const leadsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/leads", params)),
  create: (payload: unknown) => apiRequest("/api/leads", { method: "POST", body: payload }),
  update: (id: string, payload: unknown) => apiRequest(`/api/leads/${id}`, { method: "PATCH", body: payload }),
  assign: (id: string, payload: unknown) => apiRequest(`/api/leads/${id}/assign`, { method: "POST", body: payload }),
  addFollowup: (id: string, payload: unknown) => apiRequest(`/api/leads/${id}/followups`, { method: "POST", body: payload }),
  distribute: () => apiRequest("/api/leads/distribute", { method: "POST" }),
  reassignInactive: () => apiRequest("/api/leads/reassign-inactive", { method: "POST" }),
  processSlaBreaches: () => apiRequest("/api/leads/sla/process-breaches", { method: "POST" }),
};
