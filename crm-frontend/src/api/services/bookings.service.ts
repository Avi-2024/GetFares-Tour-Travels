/**
 * Bookings Service
 * Business logic layer for booking management
 */

import { bookingsEndpoints, type Booking, type CreateBookingPayload } from '../endpoints/bookings.api';

export class BookingsService {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
    search?: string;
  }) {
    const response = await bookingsEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateBookingPayload) {
    const response = await bookingsEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await bookingsEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: Partial<CreateBookingPayload>) {
    const response = await bookingsEndpoints.update(id, payload);
    return response.data;
  }

  async changeStatus(id: string, status: string, reason?: string) {
    await bookingsEndpoints.changeStatus(id, status, reason);
  }

  async recordPayment(id: string, amount: number, method: string, reference?: string) {
    await bookingsEndpoints.recordPayment(id, amount, method, reference);
  }

  async getPayments(id: string) {
    const response = await bookingsEndpoints.getPayments(id);
    return response;
  }

  async uploadDocument(id: string, file: File, type: string) {
    await bookingsEndpoints.uploadDocument(id, file, type);
  }

  async getDocuments(id: string) {
    const response = await bookingsEndpoints.getDocuments(id);
    return response;
  }

  async cancel(id: string, reason: string) {
    await bookingsEndpoints.cancel(id, reason);
  }

  // Helper methods
  calculateBalance(booking: Booking): number {
    return booking.totalAmount - booking.paidAmount;
  }

  getPaymentStatus(booking: Booking): 'PAID' | 'PARTIAL' | 'UNPAID' {
    if (booking.paidAmount >= booking.totalAmount) return 'PAID';
    if (booking.paidAmount > 0) return 'PARTIAL';
    return 'UNPAID';
  }

  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'yellow',
      CONFIRMED: 'green',
      COMPLETED: 'blue',
      CANCELLED: 'red',
    };
    return statusMap[status.toUpperCase()] || 'gray';
  }
}

export const bookingsService = new BookingsService();
