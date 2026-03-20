import type { HttpClient } from "../api/apiClient";

export type LeadsQuery = Record<string, string | number | boolean | undefined>;

export type LeadApiRecord = {
  id?: number | string;
  leadId?: string;
  code?: string;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
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
  priorityLevel?: number | string;
  temperature?: string;
  sla?: string;
  slaStatus?: string;
  assignedTo?: string | null;
  assignedUser?: {
    id?: string | null;
    fullName?: string | null;
    email?: string | null;
  } | null;
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
    client.patch(`/api/leads/${id}`, {
      status: "LOST",
      closedReason: reason,
      notes,
    }),
  checkDuplicate: (email?: string, phone?: string) =>
    client.get<LeadsListResponse>("/api/leads", {
      params: { email, phone, page: 1, limit: 1 },
    }),
  getCampaigns: () => client.get("/api/campaigns", { params: { status: "ACTIVE" } }),
  getDestinations: () => client.get("/api/destinations"),
  distribute: () => client.post("/api/leads/distribute"),
  reassignInactive: () => client.post("/api/leads/reassign-inactive"),
  processSlaBreaches: () => client.post("/api/leads/sla/process-breaches"),
  getSlaStatus: (id: string) => client.get(`/api/leads/${id}/sla-status`),
  publicCapture: (payload: unknown) =>
    client.post("/api/webhooks/website-enquiry", payload, { skipAuth: true }),
});

export type LeadsDatasource = ReturnType<typeof createLeadsDatasource>;
