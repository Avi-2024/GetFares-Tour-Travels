import { apiClient, withQuery } from '../core';

export interface Lead {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  status?: string;
  statusLabel?: string;
  temperature?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadPayload {
  fullName: string;
  email?: string;
  phone: string;
  destinationId?: string;
  budget?: number;
  travelDate?: string;
  notes?: string;
}

export interface UpdateLeadPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  subStatus?: string;
  followupType?: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'FINAL_REMINDER' | 'TASK';
  temperature?: string;
  notes?: string;
  closedReason?: string;
}

export const leadsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Lead[] }>(withQuery('/api/leads', params)),

  create: (payload: CreateLeadPayload) =>
    apiClient.post<{ data: Lead }>('/api/leads', payload),

  getById: (id: string) =>
    apiClient.get<{ data: Lead }>(`/api/leads/${id}`),

  update: (id: string, payload: UpdateLeadPayload) =>
    apiClient.patch<{ data: Lead }>(`/api/leads/${id}`, payload),

  assign: (id: string, assignedTo: string, reason?: string) =>
    apiClient.post(`/api/leads/${id}/assign`, { assignedTo, reason }),

  addFollowup: (id: string, notes: string, nextFollowupDate?: string) =>
    apiClient.post(`/api/leads/${id}/followups`, { notes, nextFollowupDate }),

  getFollowups: (id: string) =>
    apiClient.get(`/api/leads/${id}/followups`),

  markAsLost: (id: string, reason: string, notes?: string) =>
    apiClient.patch(`/api/leads/${id}`, { status: 'LOST', closedReason: reason, notes }),

  checkDuplicate: (email?: string, phone?: string) =>
    apiClient.get<{ data: { isDuplicate: boolean; matches?: Lead[] } }>(
      withQuery('/api/leads/check-duplicate', { email, phone })
    ),

  distribute: (limit?: number, reason?: string) =>
    apiClient.post('/api/leads/distribute', { limit, reason }),
};
