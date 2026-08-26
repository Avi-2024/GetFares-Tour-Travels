import { apiRequest } from "./apiClient";
import type {
  CanonicalLeadStatus,
  LeadStatusWorkflow,
} from "../utils/leadStatus";

export type SystemSettingsPayload = {
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  websiteUrl?: string;
};

export type IntegrationSettingsPayload = {
  metaAppId?: string;
  metaAccessToken?: string;
  whatsappApiToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  webhookUrl?: string;
};

export type LeadStatusMainPayload = {
  code?: string;
  label: string;
  canonicalStatus: CanonicalLeadStatus;
  sortOrder?: number;
  color?: string;
  isActive?: boolean;
  isTerminal?: boolean;
  requiresSubStatus?: boolean;
  requiresQuotation?: boolean;
  createsBooking?: boolean;
  isBookingControlled?: boolean;
};

export type LeadStatusSubPayload = {
  mainStatusId: string;
  code?: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
  isTerminal?: boolean;
};

export type LeadStatusReorderPayload = {
  mainStatuses?: Array<{ id: string; sortOrder: number }>;
  subStatuses?: Array<{ id: string; sortOrder: number }>;
};

export const settingsApi = {
  getAll: () => apiRequest("/api/settings"),
  getSystem: () => apiRequest("/api/settings/system"),
  getSystemPreferences: () => apiRequest("/api/settings/system/preferences"),
  updateSystem: (payload: SystemSettingsPayload) =>
    apiRequest("/api/settings/system", { method: "PATCH", body: payload }),
  getIntegrations: () => apiRequest("/api/settings/integrations"),
  updateIntegrations: (payload: IntegrationSettingsPayload) =>
    apiRequest("/api/settings/integrations", { method: "PATCH", body: payload }),
  getLeadStatusWorkflow: () =>
    apiRequest<{ data?: LeadStatusWorkflow }>("/api/settings/lead-status-workflow"),
  createLeadStatusMain: (payload: LeadStatusMainPayload) =>
    apiRequest<{ data?: LeadStatusWorkflow }>("/api/settings/lead-status-workflow/main", {
      method: "POST",
      body: payload,
    }),
  updateLeadStatusMain: (id: string, payload: Partial<LeadStatusMainPayload>) =>
    apiRequest<{ data?: LeadStatusWorkflow }>(`/api/settings/lead-status-workflow/main/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  createLeadStatusSub: (payload: LeadStatusSubPayload) =>
    apiRequest<{ data?: LeadStatusWorkflow }>("/api/settings/lead-status-workflow/sub", {
      method: "POST",
      body: payload,
    }),
  updateLeadStatusSub: (id: string, payload: Partial<LeadStatusSubPayload>) =>
    apiRequest<{ data?: LeadStatusWorkflow }>(`/api/settings/lead-status-workflow/sub/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  reorderLeadStatusWorkflow: (payload: LeadStatusReorderPayload) =>
    apiRequest<{ data?: LeadStatusWorkflow }>("/api/settings/lead-status-workflow/reorder", {
      method: "PATCH",
      body: payload,
    }),
};
