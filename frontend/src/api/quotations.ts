import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const quotationsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/quotations", params)),
  create: (payload: unknown) => apiRequest("/api/quotations", { method: "POST", body: payload }),
  update: (id: string, payload: unknown) => apiRequest(`/api/quotations/${id}`, { method: "PATCH", body: payload }),
  generatePdf: (id: string) => apiRequest(`/api/quotations/${id}/generate-pdf`, { method: "POST" }),
  send: (id: string, payload?: unknown) => apiRequest(`/api/quotations/${id}/send`, { method: "POST", body: payload }),
  trackViewed: (id: string) => apiRequest(`/api/quotations/${id}/viewed`, { method: "POST" }),
  views: (id: string) => apiRequest(`/api/quotations/${id}/views`),
  approveMargin: (id: string, payload?: unknown) => apiRequest(`/api/quotations/${id}/approve-margin`, { method: "POST", body: payload }),
  changeStatus: (id: string, payload: unknown) => apiRequest(`/api/quotations/${id}/status`, { method: "POST", body: payload }),
  versions: (id: string) => apiRequest(`/api/quotations/${id}/versions`),
  sendLogs: (id: string) => apiRequest(`/api/quotations/${id}/send-logs`),
  runReminders: () => apiRequest("/api/quotations/reminders/run", { method: "POST" }),
  leadToQuoteReport: () => apiRequest("/api/quotations/reports/lead-to-quote"),
};
