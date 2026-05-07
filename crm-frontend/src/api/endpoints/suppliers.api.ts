/**
 * Suppliers API
 * Handles supplier and payables operations
 */

import { apiClient, withQuery } from '../core';

export interface Supplier {
  id: string;
  name: string;
  type?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  country?: string;
  isActive?: boolean;
  createdAt: string;
}

export interface Payable {
  id: string;
  supplierId: string;
  bookingId?: string;
  amount: number;
  dueDate: string;
  status: string;
  paidDate?: string;
  notes?: string;
}

export interface CreateSupplierPayload {
  name: string;
  type?: string;
  panNumber?: string;
  gstNumber?: string;
  addressLine?: string;
  supplierCurrency?: string;
  contractUrl?: string;
  rateValidUntil?: string;
  paymentDeadlineDate?: string;
  productionCommitment?: string;
  invoiceBeneficiaryName?: string;
  invoiceBankName?: string;
  invoiceAccountNumber?: string;
  invoiceIfscSwift?: string;
  invoiceUpiId?: string;
  isActive?: boolean;
  contactPerson?: string;
  email?: string;
  phone?: string;
  country?: string;
}

export interface CreatePayablePayload {
  bookingId?: string;
  payableAmount: number;
  paidAmount?: number;
  dueDate: string;
  status?: "PENDING" | "PARTIAL" | "PAID";
  paymentReference?: string;
}

export interface SettlePayablePayload {
  amount: number;
  paymentMode?: string;
  settlementDate?: string;
  reference?: string;
  notes?: string;
}

export const suppliersEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Supplier[] }>(withQuery('/api/suppliers', params)),

  create: (payload: CreateSupplierPayload) =>
    apiClient.post<{ data: Supplier }>('/api/suppliers', payload),

  getById: (id: string) =>
    apiClient.get<{ data: Supplier }>(`/api/suppliers/${id}`),

  update: (id: string, payload: Partial<CreateSupplierPayload>) =>
    apiClient.patch<{ data: Supplier }>(`/api/suppliers/${id}`, payload),

  listPayables: (id: string, params?: Record<string, any>) =>
    apiClient.get<{ data: Payable[] }>(withQuery(`/api/suppliers/${id}/payables`, params)),

  createPayable: (id: string, payload: CreatePayablePayload) =>
    apiClient.post<{ data: Payable }>(`/api/suppliers/${id}/payables`, payload),

  updatePayable: (payableId: string, payload: Partial<CreatePayablePayload>) =>
    apiClient.patch<{ data: Payable }>(`/api/suppliers/payables/${payableId}`, payload),

  settlePayable: (payableId: string, payload: SettlePayablePayload) =>
    apiClient.post<{ data: unknown }>(`/api/suppliers/payables/${payableId}/settlements`, payload),

  processPayableDeadlineAlerts: () =>
    apiClient.post('/api/suppliers/payables/process-deadline-alerts'),
};
