/**
 * Quotations Service
 * Business logic layer for quotation management
 */

import { quotationsEndpoints, type CreateQuotationPayload } from '../endpoints/quotations.api';

export class QuotationsService {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    leadId?: string;
    customerId?: string;
  }) {
    const response = await quotationsEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateQuotationPayload) {
    // Validate items
    if (!payload.items || payload.items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Validate amounts
    if (payload.totalCost <= 0 || payload.totalPrice <= 0) {
      throw new Error('Invalid amounts');
    }

    // Validate margin
    const margin = this.calculateMargin(payload.totalCost, payload.totalPrice);
    if (margin < 0) {
      throw new Error('Price cannot be less than cost');
    }

    const response = await quotationsEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await quotationsEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: Partial<CreateQuotationPayload>) {
    const response = await quotationsEndpoints.update(id, payload);
    return response.data;
  }

  async generatePdf(id: string) {
    await quotationsEndpoints.generatePdf(id);
  }

  async send(id: string, email?: string, whatsapp?: string) {
    if (!email && !whatsapp) {
      throw new Error('Email or WhatsApp is required');
    }
    await quotationsEndpoints.send(id, email, whatsapp);
  }

  async changeStatus(id: string, status: string, reason?: string) {
    await quotationsEndpoints.changeStatus(id, status, reason);
  }

  async duplicate(id: string) {
    const response = await quotationsEndpoints.duplicate(id);
    return response.data;
  }

  async listTemplates() {
    const response = await quotationsEndpoints.listTemplates();
    return response;
  }

  async createTemplate(payload: any) {
    await quotationsEndpoints.createTemplate(payload);
  }

  // Helper methods
  calculateMargin(cost: number, price: number): number {
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  }

  calculateProfit(cost: number, price: number): number {
    return price - cost;
  }

  isMarginValid(margin: number, minMargin: number = 10): boolean {
    return margin >= minMargin;
  }

  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      DRAFT: 'gray',
      SENT: 'blue',
      VIEWED: 'purple',
      ACCEPTED: 'green',
      REJECTED: 'red',
      EXPIRED: 'orange',
    };
    return statusMap[status.toUpperCase()] || 'gray';
  }

  isExpired(validUntil?: string): boolean {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }
}

export const quotationsService = new QuotationsService();
