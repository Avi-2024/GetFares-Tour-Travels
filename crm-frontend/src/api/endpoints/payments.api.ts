import { apiClient, withQuery } from '../core';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'FULL' | 'REFUNDED';
export type PaymentMode =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'PAYMENT_GATEWAY'
  | 'UPI'
  | 'CARD'
  | 'BANK'
  | 'GATEWAY';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency?: string;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paymentReference?: string;
  proofUrl?: string;
  invoiceUrl?: string;
  notes?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePaymentPayload {
  bookingId: string;
  amount: number;
  currency?: string;
  paymentMode: PaymentMode;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paymentReference?: string;
  proofUrl?: string;
  invoiceUrl?: string;
  notes?: string;
  status?: PaymentStatus;
  paidAt?: string;
  isVerified?: boolean;
}

export type UpdatePaymentPayload = Partial<
  Omit<CreatePaymentPayload, 'bookingId'>
>;

export interface VerifyPaymentPayload {
  paidAt?: string;
  status?: PaymentStatus;
  proofUrl?: string;
  invoiceUrl?: string;
  paymentReference?: string;
  gatewayPaymentId?: string;
  notes?: string;
}

export const paymentsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Payment[] }>(withQuery('/api/payments', params)),
  stats: () => apiClient.get('/api/payments/stats'),
  create: (payload: CreatePaymentPayload) =>
    apiClient.post<{ data: Payment }>('/api/payments', payload),
  getById: (id: string) => apiClient.get<{ data: Payment }>(`/api/payments/${id}`),
  update: (id: string, payload: UpdatePaymentPayload) =>
    apiClient.patch<{ data: Payment }>(`/api/payments/${id}`, payload),
  verify: (id: string, payload: VerifyPaymentPayload = {}) =>
    apiClient.post<{ data: Payment }>(`/api/payments/${id}/verify`, payload),
};
