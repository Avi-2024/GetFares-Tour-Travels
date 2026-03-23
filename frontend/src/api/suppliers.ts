import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const suppliersApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/suppliers", params)),
  create: (payload: unknown) =>
    apiRequest("/api/suppliers", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/suppliers/${id}`),
  update: (id: string, payload: unknown) =>
    apiRequest(`/api/suppliers/${id}`, { method: "PATCH", body: payload }),
  listPayables: (
    id: string,
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery(`/api/suppliers/${id}/payables`, params)),
  createPayable: (id: string, payload: unknown) =>
    apiRequest(`/api/suppliers/${id}/payables`, {
      method: "POST",
      body: payload,
    }),
  updatePayable: (payableId: string, payload: unknown) =>
    apiRequest(`/api/suppliers/payables/${payableId}`, {
      method: "PATCH",
      body: payload,
    }),
  processPayableDeadlineAlerts: (payload?: unknown) =>
    apiRequest("/api/suppliers/payables/process-deadline-alerts", {
      method: "POST",
      body: payload ?? {},
    }),
};
