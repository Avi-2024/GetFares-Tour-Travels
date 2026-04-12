/**
 * Suppliers Service
 * Business logic layer for supplier and payables management
 */

import {
  suppliersEndpoints,
  type CreateSupplierPayload,
  type CreatePayablePayload,
  type SettlePayablePayload,
} from '../endpoints/suppliers.api';

export class SuppliersService {
  async list(params?: Record<string, any>) {
    const response = await suppliersEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateSupplierPayload) {
    if (!payload.name || payload.name.trim().length === 0) {
      throw new Error('Supplier name is required');
    }

    const response = await suppliersEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await suppliersEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: Partial<CreateSupplierPayload>) {
    const response = await suppliersEndpoints.update(id, payload);
    return response.data;
  }

  async listPayables(id: string, params?: Record<string, any>) {
    const response = await suppliersEndpoints.listPayables(id, params);
    return response.data;
  }

  async createPayable(id: string, payload: CreatePayablePayload) {
    if (payload.payableAmount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!payload.dueDate) {
      throw new Error('Due date is required');
    }

    const response = await suppliersEndpoints.createPayable(id, payload);
    return response.data;
  }

  async updatePayable(payableId: string, payload: Partial<CreatePayablePayload>) {
    const response = await suppliersEndpoints.updatePayable(payableId, payload);
    return response.data;
  }

  async settlePayable(payableId: string, payload: SettlePayablePayload) {
    if (payload.amount <= 0) {
      throw new Error('Settlement amount must be greater than 0');
    }
    const response = await suppliersEndpoints.settlePayable(payableId, payload);
    return response.data;
  }

  async processPayableDeadlineAlerts() {
    await suppliersEndpoints.processPayableDeadlineAlerts();
  }

  // Helper methods
  getTypeColor(type: string): string {
    const typeMap: Record<string, string> = {
      HOTEL: 'blue',
      AIRLINE: 'purple',
      TRANSPORT: 'green',
      ACTIVITY: 'yellow',
      VISA: 'orange',
      INSURANCE: 'red',
    };
    return typeMap[type.toUpperCase()] || 'gray';
  }

  getPayableStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'yellow',
      PAID: 'green',
      OVERDUE: 'red',
      CANCELLED: 'gray',
    };
    return statusMap[status.toUpperCase()] || 'gray';
  }

  isPayableOverdue(dueDate: string, status: string): boolean {
    if (status === 'PAID' || status === 'CANCELLED') return false;
    return new Date(dueDate) < new Date();
  }

  getDaysUntilDue(dueDate: string): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  calculateTotalPayables(payables: any[]): number {
    return payables
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  calculateOverdueAmount(payables: any[]): number {
    return payables
      .filter(p => this.isPayableOverdue(p.dueDate, p.status))
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getUpcomingPayables(payables: any[], days: number = 7): any[] {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return payables.filter(p => {
      if (p.status !== 'PENDING') return false;
      const due = new Date(p.dueDate);
      return due >= now && due <= futureDate;
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  getSupplierTypes(): { value: string; label: string }[] {
    return [
      { value: 'HOTEL', label: 'Hotel' },
      { value: 'AIRLINE', label: 'Airline' },
      { value: 'TRANSPORT', label: 'Transport' },
      { value: 'ACTIVITY', label: 'Activity' },
      { value: 'VISA', label: 'Visa' },
      { value: 'INSURANCE', label: 'Insurance' },
    ];
  }
}

export const suppliersService = new SuppliersService();
