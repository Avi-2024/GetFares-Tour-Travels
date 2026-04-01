/**
 * Visa Service
 * Business logic layer for visa case management
 */

import { visaEndpoints } from '../endpoints/visa.api';

export class VisaService {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    country?: string;
  }) {
    const response = await visaEndpoints.list(params);
    return response;
  }

  async create(payload: any) {
    // Validate required fields
    if (!payload.customerId) {
      throw new Error('Customer is required');
    }
    if (!payload.country) {
      throw new Error('Country is required');
    }

    const response = await visaEndpoints.create(payload);
    return response;
  }

  async getById(id: string) {
    const response = await visaEndpoints.getById(id);
    return response;
  }

  async update(id: string, payload: any) {
    const response = await visaEndpoints.update(id, payload);
    return response;
  }

  async changeStatus(id: string, status: string, notes?: string) {
    await visaEndpoints.changeStatus(id, status, notes);
  }

  async listDocuments(id: string) {
    const response = await visaEndpoints.listDocuments(id);
    return response;
  }

  async addDocument(id: string, payload: any) {
    await visaEndpoints.addDocument(id, payload);
  }

  async verifyDocument(documentId: string, verified: boolean, notes?: string) {
    await visaEndpoints.verifyDocument(documentId, verified, notes);
  }

  async getChecklist(id: string) {
    const response = await visaEndpoints.getChecklist(id);
    return response;
  }

  async updateChecklist(id: string, payload: any) {
    await visaEndpoints.updateChecklist(id, payload);
  }

  // Helper methods
  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      DOCUMENT_COLLECTION: 'yellow',
      SUBMITTED: 'blue',
      BIOMETRICS: 'purple',
      UNDER_PROCESS: 'orange',
      APPROVED: 'green',
      REJECTED: 'red',
      DELIVERED: 'green',
    };
    return statusMap[status.toUpperCase()] || 'gray';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      DOCUMENT_COLLECTION: 'Document Collection',
      SUBMITTED: 'Submitted',
      BIOMETRICS: 'Biometrics',
      UNDER_PROCESS: 'Under Process',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      DELIVERED: 'Delivered',
    };
    return labelMap[status.toUpperCase()] || status;
  }

  getVisaStatuses(): { value: string; label: string }[] {
    return [
      { value: 'DOCUMENT_COLLECTION', label: 'Document Collection' },
      { value: 'SUBMITTED', label: 'Submitted' },
      { value: 'BIOMETRICS', label: 'Biometrics' },
      { value: 'UNDER_PROCESS', label: 'Under Process' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'DELIVERED', label: 'Delivered' },
    ];
  }

  isExpiringSoon(expiryDate?: string, daysThreshold = 30): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays > 0;
  }

  isExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  calculateProcessingDays(submittedDate?: string): number {
    if (!submittedDate) return 0;
    const submitted = new Date(submittedDate);
    const today = new Date();
    return Math.ceil((today.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const visaService = new VisaService();
