import { apiRequest } from "./apiClient";
import { withQuery } from "./query";
import { DESTINATIONS } from "../data/staticLists";

const extractList = (response: unknown) => {
  const data =
    (response as { data?: { data?: unknown[]; items?: unknown[] } })?.data
      ?.data ??
    (response as { data?: { data?: unknown[]; items?: unknown[] } })?.data
      ?.items ??
    (response as { data?: unknown[] })?.data ??
    response;

  return Array.isArray(data) ? data : [];
};

export const leadsApi = {
  // Get leads statistics
  getStats: (params?: { period?: string }) =>
    apiRequest(withQuery("/api/leads/stats", params)),
  
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
  checkDuplicate: async (email?: string, phone?: string) => {
    if (!email && !phone) {
      return { data: { isDuplicate: false } };
    }

    const response = await apiRequest(
      withQuery("/api/leads", { email, phone, page: 1, limit: 1 }),
    );
    const matches = extractList(response);
    const isDuplicate = matches.length > 0;

    return {
      data: {
        isDuplicate,
        message: isDuplicate ? "Similar lead already exists" : "",
        matches,
      },
    };
  },
  getCampaigns: () =>
    apiRequest(withQuery("/api/campaigns", { status: "ACTIVE" })),
  getDestinations: async () => ({ data: DESTINATIONS }),
  distribute: () => apiRequest("/api/leads/distribute", { method: "POST" }),
  reassignInactive: () =>
    apiRequest("/api/leads/reassign-inactive", { method: "POST" }),
  processSlaBreaches: () =>
    apiRequest("/api/leads/sla/process-breaches", { method: "POST" }),
  getSlaStatus: (id: string) => apiRequest(`/api/leads/${id}/sla-status`),
  publicCapture: (payload: unknown) =>
    apiRequest("/api/leads/public-capture", { method: "POST", body: payload }),
};
