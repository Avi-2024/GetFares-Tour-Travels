import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

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

// Compatibility shim: keep this surface while callsites migrate to datasource/service hooks.
export const leadsApi = {
  getStats: async (_params?: { period?: string }) => {
    const response = await apiRequest<any>(withQuery("/api/leads", { page: 1, limit: 500 }));
    const rows = extractList(response) as Array<{
      status?: string;
      statusLabel?: string;
      temperature?: string;
    }>;
    const normalized = rows.map((item) =>
      String(item.statusLabel || item.status || "").toUpperCase(),
    );
    return {
      data: {
        total: rows.length,
        new: normalized.filter((item) => item === "NEW").length,
        hot: rows.filter((item) => String(item.temperature || "").toUpperCase() === "HOT")
          .length,
        followup: normalized.filter((item) => item.startsWith("FOLLOW_UP")).length,
      },
    };
  },
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest<any>(withQuery("/api/leads", params)),
  create: (payload: unknown) =>
    apiRequest<any>("/api/leads", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest<any>(`/api/leads/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest<any>(`/api/leads/${id}`, { method: "PATCH", body: payload }),
  assign: (id: string, payload: unknown) =>
    apiRequest<any>(`/api/leads/${id}/assign`, { method: "POST", body: payload }),
  addFollowup: (id: string, payload: unknown) =>
    apiRequest<any>(`/api/leads/${id}/followups`, { method: "POST", body: payload }),
  getFollowups: (id: string) => apiRequest<any>(`/api/leads/${id}/followups`),
  getTimeline: async (id: string) => {
    const lead = await apiRequest<any>(`/api/leads/${id}`);
    const data = (lead as any)?.data?.data ?? (lead as any)?.data ?? lead;
    return {
      data: [
        {
          id: data?.id || id,
          activityType: "LEAD_STATE",
          notes: `Status: ${data?.statusLabel || data?.status || "NEW"}`,
          createdAt: data?.updatedAt || data?.createdAt || new Date().toISOString(),
        },
      ],
    };
  },
  markAsLost: (id: string, reason: string, notes?: string) =>
    apiRequest<any>(`/api/leads/${id}`, {
      method: "PATCH",
      body: { status: "LOST", closedReason: reason, notes },
    }),
  checkDuplicate: async (email?: string, phone?: string) => {
    if (!email && !phone) {
      return { data: { isDuplicate: false } };
    }

    const response = await apiRequest<any>(
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
    apiRequest<any>(withQuery("/api/campaigns", { status: "ACTIVE" })),
  getDestinations: () => apiRequest<any>("/api/destinations"),
  distribute: (payload?: { limit?: number; reason?: string }) =>
    apiRequest<any>("/api/leads/distribute", { method: "POST", body: payload }),
  reassignInactive: (payload?: {
    inactiveMinutes?: number;
    limit?: number;
    reason?: string;
  }) =>
    apiRequest<any>("/api/leads/reassign-inactive", {
      method: "POST",
      body: payload,
    }),
  processSlaBreaches: (payload?: { limit?: number }) =>
    apiRequest<any>("/api/leads/sla/process-breaches", { method: "POST", body: payload }),
  processCadenceAutomation: (payload?: { staleDays?: number; limit?: number }) =>
    apiRequest<any>("/api/leads/followups/process-cadence-automation", {
      method: "POST",
      body: payload,
    }),
  processNonResponsive: (payload?: { staleDays?: number; limit?: number }) =>
    apiRequest<any>("/api/leads/followups/process-non-responsive", {
      method: "POST",
      body: payload,
    }),
  listOverdueFollowups: (params?: { limit?: number }) =>
    apiRequest<any>(withQuery("/api/leads/followups/overdue", params)),
  getSlaStatus: async (id: string) => {
    const response = await apiRequest<any>(`/api/leads/${id}`);
    const lead = (response as any)?.data?.data ?? (response as any)?.data ?? response;
    return {
      data: {
        slaBreached: Boolean(lead?.slaBreached),
        responseDeadline: lead?.responseDeadline ?? null,
      },
    };
  },
  publicCapture: (payload: unknown) =>
    apiRequest<any>("/api/webhooks/website-enquiry", {
      method: "POST",
      body: payload,
    }),
};
