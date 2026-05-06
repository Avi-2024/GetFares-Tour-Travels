import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

// Debug function to test API with explicit token
const testApiCall = async (token?: string) => {
  const options: any = { method: "GET" };
  if (token) {
    options.token = token;
  }
  return apiRequest("/api/quotations", options);
};

export const quotationsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/quotations", params)),
  create: (payload: unknown) =>
    apiRequest("/api/quotations", { method: "POST", body: payload }),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/quotations/${id}`, { method: "PATCH", body: payload }),
  getById: (id: string) => apiRequest(`/api/quotations/${id}`),
  generatePdf: (id: string) =>
    apiRequest(`/api/quotations/${id}/generate-pdf`, { method: "POST" }),
  uploadPdf: (id: string, formData: FormData) =>
    apiRequest(`/api/quotations/${id}/upload-pdf`, {
      method: "POST",
      body: formData,
    }),
  send: (id: string, payload?: unknown) =>
    apiRequest(`/api/quotations/${id}/send`, { method: "POST", body: payload }),
  trackViewed: (id: string) =>
    apiRequest(`/api/quotations/${id}/viewed`, { method: "POST" }),
  views: (id: string) => apiRequest(`/api/quotations/${id}/views`),
  approveMargin: (id: string, payload?: unknown) =>
    apiRequest(`/api/quotations/${id}/approve-margin`, {
      method: "POST",
      body: payload,
    }),
  changeStatus: (id: string, payload: unknown) =>
    apiRequest(`/api/quotations/${id}/status`, {
      method: "POST",
      body: payload,
    }),
  versions: (id: string) => apiRequest(`/api/quotations/${id}/versions`),
  sendLogs: (id: string) => apiRequest(`/api/quotations/${id}/send-logs`),
  runReminders: () =>
    apiRequest("/api/quotations/reminders/run", { method: "POST" }),
  sendReminder: (id: string, type: "email" | "sms" | "whatsapp") =>
    apiRequest(`/api/quotations/${id}/reminder`, {
      method: "POST",
      body: { type },
    }),
  listTemplates: () => apiRequest("/api/quotations/templates"),
  createTemplate: (payload: unknown) =>
    apiRequest("/api/quotations/templates", { method: "POST", body: payload }),
  updateTemplate: (id: string, payload: unknown) =>
    apiRequest(`/api/quotations/templates/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  leadToQuoteReport: () => apiRequest("/api/quotations/reports/lead-to-quote"),
  duplicate: (id: string) =>
    apiRequest(`/api/quotations/${id}/duplicate`, { method: "POST" }),
  createVersion: (id: string, changes: unknown) =>
    apiRequest(`/api/quotations/${id}/versions`, {
      method: "POST",
      body: changes,
    }),
  listPackages: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/packages", params)),
  getPackage: (id: string) => apiRequest(`/api/packages/${id}`),
  // Debug function
  testWithToken: testApiCall,
};
