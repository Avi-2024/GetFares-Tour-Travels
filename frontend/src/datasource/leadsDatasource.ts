import type { HttpClient } from "../api/apiClient";

export type LeadsQuery = Record<string, string | number | boolean | undefined>;

export type LeadApiRecord = {
  id?: number | string;
  leadId?: string;
  code?: string;
  name?: string;
  fullName?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  destination?: string;
  country?: string;
  packageName?: string;
  package?: string;
  status?: string;
  priority?: string;
  sla?: string;
  slaStatus?: string;
  consultant?: string;
  owner?: string;
};

export type LeadsListResponse =
  | { data?: { data?: LeadApiRecord[]; items?: LeadApiRecord[] } }
  | { data?: LeadApiRecord[] }
  | LeadApiRecord[];

export const createLeadsDatasource = (client: HttpClient) => ({
  list: (params?: LeadsQuery) =>
    client.get<LeadsListResponse>("/api/leads", { params }),
  create: (payload: unknown) => client.post("/api/leads", payload),
  getById: (id: string) => client.get(`/api/leads/${id}`),
  update: (id: string, payload: unknown) =>
    client.patch(`/api/leads/${id}`, payload),
  assign: (id: string, payload: unknown) =>
    client.post(`/api/leads/${id}/assign`, payload),
  addFollowup: (id: string, payload: unknown) =>
    client.post(`/api/leads/${id}/followups`, payload),
  getFollowups: (id: string) => client.get(`/api/leads/${id}/followups`),
  getTimeline: (id: string) => client.get(`/api/leads/${id}/timeline`),
  markAsLost: (id: string, reason: string, notes?: string) =>
    client.post(`/api/leads/${id}/lost`, { reason, notes }),
  checkDuplicate: (email?: string, phone?: string) =>
    client.post("/api/leads/check-duplicate", { email, phone }),
  getCampaigns: () => client.get("/api/campaigns/active"),
  getDestinations: () => client.get("/api/destinations"),
  distribute: () => client.post("/api/leads/distribute"),
  reassignInactive: () => client.post("/api/leads/reassign-inactive"),
  processSlaBreaches: () => client.post("/api/leads/sla/process-breaches"),
  getSlaStatus: (id: string) => client.get(`/api/leads/${id}/sla-status`),
  publicCapture: (payload: unknown) =>
    client.post("/api/leads/public-capture", payload, { skipAuth: true }),
});

export type LeadsDatasource = ReturnType<typeof createLeadsDatasource>;
