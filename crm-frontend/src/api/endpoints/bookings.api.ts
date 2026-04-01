import { apiClient, withQuery } from '../core';

export interface Booking {
  id: string;
  quotationId?: string;
  customerId: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
}

export interface CreateBookingPayload {
  quotationId?: string;
  customerId: string;
  items: any[];
  totalAmount: number;
  travelDate?: string;
}

const toPaymentMode = (method: string) => {
  switch (String(method || '').trim().toUpperCase()) {
    case 'CASH':
      return 'CASH';
    case 'CARD':
      return 'CARD';
    case 'UPI':
      return 'UPI';
    case 'GATEWAY':
    case 'PAYMENT_GATEWAY':
      return 'PAYMENT_GATEWAY';
    case 'CHEQUE':
    case 'BANK':
    case 'BANK_TRANSFER':
    default:
      return 'BANK_TRANSFER';
  }
};

export const bookingsEndpoints = {
  list: (params?: Record<string, any>) =>
    apiClient.get<{ data: Booking[] }>(withQuery('/api/bookings', params)),

  create: (payload: CreateBookingPayload) =>
    apiClient.post<{ data: Booking }>('/api/bookings', payload),

  getById: (id: string) =>
    apiClient.get<{ data: Booking }>(`/api/bookings/${id}`),

  update: (id: string, payload: Partial<CreateBookingPayload>) =>
    apiClient.patch<{ data: Booking }>(`/api/bookings/${id}`, payload),

  changeStatus: (id: string, status: string, reason?: string) =>
    apiClient.post(`/api/bookings/${id}/status`, { status, reason }),

  recordPayment: (
    id: string,
    amount: number,
    method: string,
    reference?: string,
  ) =>
    apiClient.post('/api/payments', {
      bookingId: id,
      amount,
      paymentMode: toPaymentMode(method),
      paymentReference: reference,
    }),

  getPayments: (id: string) =>
    apiClient.get(withQuery('/api/payments', { bookingId: id })),

  uploadDocument: (id: string, file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.post(`/api/bookings/${id}/documents`, formData);
  },

  getDocuments: (id: string) =>
    apiClient.get(`/api/bookings/${id}/documents`),

  cancel: (id: string, reason: string) =>
    apiClient.post(`/api/bookings/${id}/status`, { status: 'CANCELLED', cancellationReason: reason }),
};
