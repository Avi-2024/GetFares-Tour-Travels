import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const visaApi = {
  list: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/visa", params)),
  create: (payload: unknown) => apiRequest("/api/visa", { method: "POST", body: payload }),
  getById: (id: string) => apiRequest(`/api/visa/${id}`),
  update: (id: string, payload: unknown) => apiRequest(`/api/visa/${id}`, { method: "PATCH", body: payload }),
  changeStatus: (id: string, payload: unknown) => apiRequest(`/api/visa/${id}/status`, { method: "POST", body: payload }),
  listDocuments: (id: string) => apiRequest(`/api/visa/${id}/documents`),
  addDocument: (id: string, payload: unknown) => apiRequest(`/api/visa/${id}/documents`, { method: "POST", body: payload }),
  verifyDocument: (documentId: string, payload: unknown) => apiRequest(`/api/visa/documents/${documentId}/verify`, { method: "PATCH", body: payload }),
  getChecklist: (id: string) => apiRequest(`/api/visa/${id}/checklist`),
  updateChecklist: (id: string, payload: unknown) => apiRequest(`/api/visa/${id}/checklist`, { method: "PATCH", body: payload }),
};
