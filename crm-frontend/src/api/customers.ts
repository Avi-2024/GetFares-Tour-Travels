import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const customersApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/customers", params)),
  create: (payload: unknown) =>
    apiRequest("/api/customers", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/customers/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/customers/${id}`, { method: "PATCH", body: payload }),
  delete: (id: string) =>
    apiRequest(`/api/customers/${id}`, { method: "DELETE" }),
  linkToLead: (customerId: string, leadId: string) =>
    apiRequest(`/api/customers/${customerId}/link-lead`, {
      method: "POST",
      body: { leadId },
    }),
  getLeads: (id: string) => apiRequest(`/api/customers/${id}/leads`),
  getBookings: (id: string) => apiRequest(`/api/customers/${id}/bookings`),
  updateSegment: (id: string, segment: string) =>
    apiRequest(`/api/customers/${id}/segment`, {
      method: "PATCH",
      body: { segment },
    }),
  export: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/customers/export", params), {
      responseType: "blob",
    }),
};
