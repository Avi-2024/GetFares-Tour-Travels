/**
 * Leads Service
 * Business logic layer for lead management
 */

import { leadsEndpoints, type CreateLeadPayload, type UpdateLeadPayload } from '../endpoints/leads.api';

export class LeadsService {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: string;
    temperature?: string;
    assignedTo?: string;
    search?: string;
  }) {
    const response = await leadsEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateLeadPayload) {
    // Validate phone
    if (!payload.phone || payload.phone.length < 10) {
      throw new Error('Valid phone number is required');
    }

    // Check for duplicates
    const duplicateCheck = await leadsEndpoints.checkDuplicate(payload.email, payload.phone);
    if (duplicateCheck.data.isDuplicate) {
      throw new Error('Lead with this email or phone already exists');
    }

    const response = await leadsEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await leadsEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: UpdateLeadPayload) {
    const response = await leadsEndpoints.update(id, payload);
    return response.data;
  }

  async assign(id: string, assignedTo: string, reason?: string) {
    await leadsEndpoints.assign(id, assignedTo, reason);
  }

  async addFollowup(id: string, notes: string, nextFollowupDate?: string) {
    await leadsEndpoints.addFollowup(id, notes, nextFollowupDate);
  }

  async getFollowups(id: string) {
    const response = await leadsEndpoints.getFollowups(id);
    return response;
  }

  async markAsLost(id: string, reason: string, notes?: string) {
    await leadsEndpoints.markAsLost(id, reason, notes);
  }

  async distribute(limit?: number, reason?: string) {
    await leadsEndpoints.distribute(limit, reason);
  }

  // Helper methods
  getStatusColor(status?: string): string {
    const statusMap: Record<string, string> = {
      NEW: 'blue',
      CONTACTED: 'yellow',
      QUALIFIED: 'green',
      QUOTED: 'purple',
      CONVERTED: 'green',
      LOST: 'red',
    };
    return statusMap[status?.toUpperCase() || 'NEW'] || 'gray';
  }

  getTemperatureColor(temperature?: string): string {
    const tempMap: Record<string, string> = {
      HOT: 'red',
      WARM: 'orange',
      COLD: 'blue',
    };
    return tempMap[temperature?.toUpperCase() || 'COLD'] || 'gray';
  }
}

export const leadsService = new LeadsService();
