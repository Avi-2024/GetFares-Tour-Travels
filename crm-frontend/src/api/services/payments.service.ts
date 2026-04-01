/**
 * Payments Service
 * Business logic layer for payment management
 */

import {
  paymentsEndpoints,
  type CreatePaymentPayload,
  type Payment,
  type PaymentMode,
  type PaymentStatus,
  type UpdatePaymentPayload,
  type VerifyPaymentPayload,
} from '../endpoints/payments.api';

export class PaymentsService {
  async list(params?: {
    page?: number;
    limit?: number;
    bookingId?: string;
    status?: string;
  }) {
    const response = await paymentsEndpoints.list(params);
    return response.data;
  }

  async stats() {
    const response = await paymentsEndpoints.stats();
    return response;
  }

  async create(payload: CreatePaymentPayload) {
    // Validate amount
    if (payload.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate payment mode
    if (!payload.paymentMode) {
      throw new Error('Payment mode is required');
    }

    const response = await paymentsEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await paymentsEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: UpdatePaymentPayload) {
    const response = await paymentsEndpoints.update(id, payload);
    return response.data;
  }

  async verify(id: string, payload: VerifyPaymentPayload = {}) {
    const response = await paymentsEndpoints.verify(id, payload);
    return response.data;
  }

  // Helper methods
  getMethodColor(method: PaymentMode | string): string {
    const methodMap: Record<string, string> = {
      CASH: 'green',
      CARD: 'blue',
      UPI: 'purple',
      BANK_TRANSFER: 'yellow',
      PAYMENT_GATEWAY: 'indigo',
      BANK: 'yellow',
      GATEWAY: 'indigo',
    };
    return methodMap[String(method || '').toUpperCase()] || 'gray';
  }

  getStatusColor(status: PaymentStatus | string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'yellow',
      PARTIAL: 'blue',
      FULL: 'green',
      REFUNDED: 'orange',
    };
    return statusMap[String(status || '').toUpperCase()] || 'gray';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  calculateTotalPaid(payments: Payment[]): number {
    return payments
      .filter(p => p.isVerified === true)
      .filter(p => p.status !== 'REFUNDED')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getPaymentMethods(): { value: PaymentMode; label: string }[] {
    return [
      { value: 'CASH', label: 'Cash' },
      { value: 'CARD', label: 'Card' },
      { value: 'UPI', label: 'UPI' },
      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
      { value: 'PAYMENT_GATEWAY', label: 'Payment Gateway' },
    ];
  }

  isPaymentComplete(totalAmount: number, paidAmount: number): boolean {
    return paidAmount >= totalAmount;
  }

  calculateBalance(totalAmount: number, paidAmount: number): number {
    return totalAmount - paidAmount;
  }

  getPaymentPercentage(totalAmount: number, paidAmount: number): number {
    if (totalAmount === 0) return 0;
    return (paidAmount / totalAmount) * 100;
  }
}

export const paymentsService = new PaymentsService();
