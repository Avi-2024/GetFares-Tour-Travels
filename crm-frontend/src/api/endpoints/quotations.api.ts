import { apiClient, withQuery } from '../core';

export interface Quotation {
  id: string;
  leadId?: string;
  customerId?: string;
  totalCost: number;
  totalPrice: number;
  margin: number;
  status: string;
  createdAt: string;
}

export interface CreateQuotationPayload {
  leadId?: string;
  customerId?: string;
  items: any[];
  totalCost: number;
  totalPrice: number;
  validUntil?: string;
}

export const quotationsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Quotation[] }>(withQuery('/api/quotations', params)),

  create: (payload: CreateQuotationPayload) =>
    apiClient.post<{ data: Quotation }>('/api/quotations', payload),

  getById: (id: string) =>
    apiClient.get<{ data: Quotation }>(`/api/quotations/${id}`),

  update: (id: string, payload: Partial<CreateQuotationPayload>) =>
    apiClient.patch<{ data: Quotation }>(`/api/quotations/${id}`, payload),

  generatePdf: (id: string) =>
    apiClient.post(`/api/quotations/${id}/generate-pdf`),

  send: (id: string, email?: string, whatsapp?: string) =>
    apiClient.post(`/api/quotations/${id}/send`, { email, whatsapp }),

  changeStatus: (id: string, status: string, reason?: string) =>
    apiClient.post(`/api/quotations/${id}/status`, { status, reason }),

  duplicate: (id: string) =>
    apiClient.post<{ data: Quotation }>(`/api/quotations/${id}/duplicate`),

  listTemplates: () =>
    apiClient.get('/api/quotations/templates'),

  createTemplate: (payload: any) =>
    apiClient.post('/api/quotations/templates', payload),
};
