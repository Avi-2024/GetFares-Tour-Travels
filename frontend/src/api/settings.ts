import { apiRequest } from "./apiClient";

export type SystemSettingsPayload = {
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
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

export const settingsApi = {
  getAll: () => apiRequest("/api/settings"),
  getSystem: () => apiRequest("/api/settings/system"),
  updateSystem: (payload: SystemSettingsPayload) =>
    apiRequest("/api/settings/system", { method: "PATCH", body: payload }),
  getIntegrations: () => apiRequest("/api/settings/integrations"),
  updateIntegrations: (payload: IntegrationSettingsPayload) =>
    apiRequest("/api/settings/integrations", { method: "PATCH", body: payload }),
};
