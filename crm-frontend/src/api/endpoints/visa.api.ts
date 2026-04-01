import { apiClient, withQuery } from '../core';

export const visaEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/visa', params)),
  create: (payload: any) => apiClient.post('/api/visa', payload),
  getById: (id: string) => apiClient.get(`/api/visa/${id}`),
  update: (id: string, payload: any) => apiClient.patch(`/api/visa/${id}`, payload),
  changeStatus: (id: string, status: string, notes?: string) =>
    apiClient.post(`/api/visa/${id}/status`, { status, notes }),
  listDocuments: (id: string) => apiClient.get(`/api/visa/${id}/documents`),
  addDocument: (id: string, payload: any) =>
    apiClient.post(`/api/visa/${id}/documents`, payload),
  verifyDocument: (documentId: string, verified: boolean, notes?: string) =>
    apiClient.patch(`/api/visa/documents/${documentId}/verify`, { verified, notes }),
  getChecklist: (id: string) => apiClient.get(`/api/visa/${id}/checklist`),
  updateChecklist: (id: string, payload: any) =>
    apiClient.patch(`/api/visa/${id}/checklist`, payload),
};
