import type { HttpClient } from "../api/apiClient";

export type LeadsQuery = Record<string, string | number | boolean | undefined>;

export type LeadDestinationRecord =
  | {
      id?: string | null;
      name?: string | null;
      country?: string | null;
    }
  | string
  | null;

export type LeadAssignedUser = {
  id?: string | null;
  fullName?: string | null;
  email?: string | null;
} | null;

export type LeadAssignedBy = {
  id?: string | null;
  fullName?: string | null;
} | null;

export type LeadApiRecord = {
  id?: number | string;
  leadId?: string;
  code?: string;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  fullName?: string | null;
  name?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  destination?: LeadDestinationRecord;
  destinationId?: string | null;
  destinationName?: string | null;
  leadCode?: string | null;
  lead_code?: string | null;
  metaLeadId?: string | null;
  meta_lead_id?: string | null;
  travelFrom?: string | null;
  travel_from?: string | null;
  travelTo?: string | null;
  travel_to?: string | null;
  clientCurrency?: string | null;
  client_currency?: string | null;
  country?: string | null;
  leadCountry?: string | null;
  childAges?: number[] | null;
  callsDisabled?: boolean | null;
  packageName?: string | null;
  package?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  subStatus?: string | null;
  priority?: string | null;
  priorityLevel?: number | string | null;
  temperature?: string | null;
  sla?: string | null;
  slaStatus?: string | null;
  slaBreached?: boolean | null;
  assignedTo?: string | null;
  assignedUser?: LeadAssignedUser;
  assignedBy?: string | null;
  assignedByUser?: LeadAssignedBy;
  adultsCount?: number | null;
  childrenCount?: number | null;
  travelDate?: string | null;
  travelEndDate?: string | null;
  travel_end_date?: string | null;
  budget?: number | null;
  visaRequired?: boolean | null;
  preferredHotelCategory?: string | null;
  travelPurpose?: string | null;
  source?: string | null;
  leadSource?: string | null;
  utmSource?: string | null;
  utm_source?: string | null;
  qualificationCompleted?: boolean | null;
  followupAttempts?: number | null;
  finalReminderAt?: string | null;
  nonResponsiveMarkedAt?: string | null;
};

export type LeadFollowupRecord = {
  id?: string;
  leadId?: string;
  userId?: string | null;
  userFullName?: string | null;
  userName?: string | null;
  actorName?: string | null;
  followupType?: "CALL" | "WHATSAPP" | "EMAIL" | "FINAL_REMINDER" | "TASK";
  followupTypeCode?: number;
  followupDate?: string | null;
  cadenceCode?: string | null;
  statusSnapshot?: string | null;
  notes?: string | null;
  isCompleted?: boolean;
  isScheduleOnly?: boolean;
  countsTowardCompliance?: boolean;
  createdAt?: string | null;
};

export type LeadsListResponse =
  | { data?: { data?: LeadApiRecord[]; items?: LeadApiRecord[] } }
  | { data?: LeadApiRecord[] }
  | LeadApiRecord[];

export type LeadFollowupsResponse =
  | { data?: { data?: LeadFollowupRecord[]; items?: LeadFollowupRecord[] } }
  | { data?: LeadFollowupRecord[] }
  | LeadFollowupRecord[];

export const createLeadsDatasource = (client: HttpClient) => ({
  list: (params?: LeadsQuery) =>
    client.get<LeadsListResponse>("/api/leads", { params }),
  create: (payload: unknown) => client.post("/api/leads", payload),
  getById: (id: string) => client.get(`/api/leads/${id}`),
  update: (id: string, payload: unknown) => client.patch(`/api/leads/${id}`, payload),
  assign: (id: string, payload: unknown) => client.post(`/api/leads/${id}/assign`, payload),
  addFollowup: (id: string, payload: unknown) =>
    client.post(`/api/leads/${id}/followups`, payload),
  getFollowups: (id: string) =>
    client.get<LeadFollowupsResponse>(`/api/leads/${id}/followups`),
  markAsLost: (id: string, reason: string, notes?: string) =>
    client.patch(`/api/leads/${id}`, {
      status: "LOST",
      closedReason: reason,
      notes,
    }),
  checkDuplicate: (email?: string, phone?: string) =>
    client.get<LeadsListResponse>("/api/leads", {
      params: { email, phone, page: 1, limit: 1, quickFilter: "ACTIVE" },
    }),
  getCampaigns: () => client.get("/api/campaigns", { params: { status: "ACTIVE" } }),
  getDestinations: () => client.get("/api/destinations"),
  distribute: (payload?: { limit?: number; reason?: string }) =>
    client.post("/api/leads/distribute", payload),
  reassignInactive: (payload?: { inactiveMinutes?: number; limit?: number; reason?: string }) =>
    client.post("/api/leads/reassign-inactive", payload),
  listOverdueFollowups: (params?: { limit?: number }) =>
    client.get("/api/leads/followups/overdue", { params }),
  processOverdueFollowups: (payload?: { limit?: number }) =>
    client.post("/api/leads/followups/process-overdue", payload),
  processSlaBreaches: (payload?: { limit?: number }) =>
    client.post("/api/leads/sla/process-breaches", payload),
  processNonResponsive: (payload?: { staleDays?: number; limit?: number }) =>
    client.post("/api/leads/followups/process-non-responsive", payload),
  processCadenceAutomation: (payload?: { staleDays?: number; limit?: number }) =>
    client.post("/api/leads/followups/process-cadence-automation", payload),
  disableCalls: (id: string, disabled: boolean) =>
    client.post(`/api/leads/${id}/disable-calls`, { disabled }),
  publicCapture: (payload: unknown) =>
    client.post("/api/webhooks/website-enquiry", payload, { skipAuth: true }),
});

export type LeadsDatasource = ReturnType<typeof createLeadsDatasource>;
