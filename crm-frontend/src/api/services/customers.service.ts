/**
 * Customers Service
 * Business logic layer for customer management
 */

import { customersEndpoints } from '../endpoints/customers.api';
import { isValidPhoneDigits, PHONE_DIGITS_MIN_ERROR } from '../../utils/phoneValidation';

export class CustomersService {
  async list(params?: {
    page?: number;
    limit?: number;
    segment?: string;
    search?: string;
  }) {
    const response = await customersEndpoints.list(params);
    return response;
  }

  async create(payload: any) {
    // Validate email
    if (payload.email && !this.isValidEmail(payload.email)) {
      throw new Error('Invalid email address');
    }

    // Validate phone
    if (!payload.phone || !isValidPhoneDigits(payload.phone)) {
      throw new Error(PHONE_DIGITS_MIN_ERROR);
    }

    const response = await customersEndpoints.create(payload);
    return response;
  }

  async getById(id: string) {
    const response = await customersEndpoints.getById(id);
    return response;
  }

  async update(id: string, payload: any) {
    const response = await customersEndpoints.update(id, payload);
    return response;
  }

  async delete(id: string) {
    await customersEndpoints.delete(id);
  }

  async linkToLead(customerId: string, leadId: string) {
    await customersEndpoints.linkToLead(customerId, leadId);
  }

  async getLeads(id: string) {
    const response = await customersEndpoints.getLeads(id);
    return response;
  }

  async getBookings(id: string) {
    const response = await customersEndpoints.getBookings(id);
    return response;
  }

  async updateSegment(id: string, segment: string) {
    await customersEndpoints.updateSegment(id, segment);
  }

  async export(params?: Record<string, any>) {
    const blob = await customersEndpoints.export(params);
    this.downloadBlob(blob, 'customers.xlsx');
  }

  // Helper methods
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getSegmentColor(segment?: string): string {
    const segmentMap: Record<string, string> = {
      PLATINUM: 'purple',
      GOLD: 'yellow',
      SILVER: 'gray',
      NEW: 'blue',
    };
    return segmentMap[segment?.toUpperCase() || 'NEW'] || 'gray';
  }

  getSegmentBadge(segment?: string): { text: string; color: string } {
    const color = this.getSegmentColor(segment);
    return { text: segment || 'New', color };
  }

  calculateLifetimeValue(bookings: any[]): number {
    return bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  }

  getTotalBookings(customer: any): number {
    return customer.bookings?.length || 0;
  }

  getLastBookingDate(customer: any): string | null {
    if (!customer.bookings || customer.bookings.length === 0) return null;
    const sorted = [...customer.bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0].createdAt;
  }

  private downloadBlob(blob: any, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const customersService = new CustomersService();
