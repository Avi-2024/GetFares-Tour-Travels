import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const bookingsApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/bookings", params)),
  create: (payload: unknown) => apiRequest("/api/bookings", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/bookings/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/bookings/${id}`, { method: "PATCH", body: payload }),
  changeStatus: (id: string, payload: unknown) => apiRequest(`/api/bookings/${id}/status`, { method: "POST", body: payload }),
  statusHistory: (id: string) => apiRequest(`/api/bookings/${id}/status-history`),
  generateInvoice: (id: string) => apiRequest(`/api/bookings/${id}/invoices/generate`, { method: "POST" }),
  listInvoices: (id: string) => apiRequest(`/api/bookings/${id}/invoices`),
};
