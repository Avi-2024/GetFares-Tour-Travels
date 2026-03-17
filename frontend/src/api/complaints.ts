import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const complaintsApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/complaints", params)),
  create: (payload: unknown) =>
    apiRequest("/api/complaints", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/complaints/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/complaints/${id}`, { method: "PATCH", body: payload }),
  listActivities: (id: string) =>
    apiRequest(`/api/complaints/${id}/activities`),
  addActivity: (id: string, payload: unknown) =>
    apiRequest(`/api/complaints/${id}/activities`, {
      method: "POST",
      body: payload,
    }),
  changeStatus: (id: string, status: string, reason?: string) =>
    apiRequest(`/api/complaints/${id}/status`, {
      method: "POST",
      body: { status, reason },
    }),
  getStatusHistory: (id: string) =>
    apiRequest(`/api/complaints/${id}/status-history`),
  assignTo: (id: string, userId: string) =>
    apiRequest(`/api/complaints/${id}/assign`, {
      method: "POST",
      body: { userId },
    }),
  escalate: (id: string, reason: string) =>
    apiRequest(`/api/complaints/${id}/escalate`, {
      method: "POST",
      body: { reason },
    }),
};
