import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const customersApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/customers", params)),
  create: (payload: unknown) => apiRequest("/api/customers", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/customers/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/customers/${id}`, { method: "PATCH", body: payload }),
};
