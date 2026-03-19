import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const bookingsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/bookings", params)),
  stats: () => apiRequest("/api/bookings/stats"),
  create: (payload: unknown) =>
    apiRequest("/api/bookings", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/bookings/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/bookings/${id}`, { method: "PATCH", body: payload }),
  changeStatus: (id: string, payload: unknown) =>
    apiRequest(`/api/bookings/${id}/status`, { method: "POST", body: payload }),
  statusHistory: (id: string) =>
    apiRequest(`/api/bookings/${id}/status-history`),
  generateInvoice: (id: string) =>
    apiRequest(`/api/bookings/${id}/invoices/generate`, { method: "POST" }),
  listInvoices: (id: string) => apiRequest(`/api/bookings/${id}/invoices`),
  getDocuments: (id: string) => apiRequest(`/api/bookings/${id}/documents`),
  uploadDocument: (id: string, file: File, type: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    return apiRequest(`/api/bookings/${id}/documents`, {
      method: "POST",
      body: formData,
    });
  },
  getPaymentStatus: (id: string) =>
    apiRequest(`/api/bookings/${id}/payment-status`),
  recordPayment: (id: string, payload: unknown) =>
    apiRequest(`/api/bookings/${id}/payments`, {
      method: "POST",
      body: payload,
    }),
  getPayments: (id: string) => apiRequest(`/api/bookings/${id}/payments`),
  sendConfirmation: (id: string) =>
    apiRequest(`/api/bookings/${id}/send-confirmation`, { method: "POST" }),
  cancel: (id: string, reason: string) =>
    apiRequest(`/api/bookings/${id}/status`, {
      method: "POST",
      body: { status: "CANCELLED", cancellationReason: reason },
    }),
};
