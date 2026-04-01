import { apiClient, withQuery } from '../core';

export const customersEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/customers', params)),
  create: (payload: any) => apiClient.post('/api/customers', payload),
  getById: (id: string) => apiClient.get(`/api/customers/${id}`),
  update: (id: string, payload: any) => apiClient.patch(`/api/customers/${id}`, payload),
  delete: (id: string) => apiClient.delete(`/api/customers/${id}`),
  linkToLead: (customerId: string, leadId: string) =>
    apiClient.post(`/api/customers/${customerId}/link-lead`, { leadId }),
  getLeads: (id: string) => apiClient.get(`/api/customers/${id}/leads`),
  getBookings: (id: string) => apiClient.get(`/api/customers/${id}/bookings`),
  updateSegment: (id: string, segment: string) =>
    apiClient.patch(`/api/customers/${id}/segment`, { segment }),
  export: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/customers/export', params), { responseType: 'blob' }),
};
