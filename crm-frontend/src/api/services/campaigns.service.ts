/**
 * Campaigns Service
 * Business logic layer for campaign management
 */

import {
  campaignsEndpoints,
  type Campaign,
  type CreateCampaignPayload,
} from "../endpoints/campaigns.api";

export class CampaignsService {
  async list(params?: { page?: number; limit?: number; source?: string; name?: string }) {
    const response = await campaignsEndpoints.list(params);
    return response.data;
  }

  async create(payload: CreateCampaignPayload) {
    // Validate dates
    this.validateDateRange(payload.startDate, payload.endDate);

    const response = await campaignsEndpoints.create(payload);
    return response.data;
  }

  async getById(id: string) {
    const response = await campaignsEndpoints.getById(id);
    return response.data;
  }

  async update(id: string, payload: Partial<CreateCampaignPayload>) {
    // Validate dates if provided
    if (payload.startDate && payload.endDate) {
      this.validateDateRange(payload.startDate, payload.endDate);
    }

    const response = await campaignsEndpoints.update(id, payload);
    return response.data;
  }

  async delete(id: string) {
    await campaignsEndpoints.delete(id);
  }

  async duplicate(id: string) {
    const response = await campaignsEndpoints.duplicate(id);
    return response.data;
  }

  // Helper methods
  validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (end <= start) {
      throw new Error('End date must be after start date');
    }

  }

  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      DRAFT: 'gray',
      ACTIVE: 'green',
      COMPLETED: 'blue',
    };
    return statusMap[status.toUpperCase()] || "gray";
  }

  getTypeColor(source: string): string {
    const sourceMap: Record<string, string> = {
      META: "blue",
      INSTAGRAM: "purple",
      GOOGLE: "red",
      TWITTER: "sky",
      LINKEDIN: "indigo",
      OTHER: "gray",
    };
    return sourceMap[source.toUpperCase()] || "gray";
  }

  isActive(campaign: Campaign): boolean {
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    return now >= start && now <= end;
  }

  isUpcoming(campaign: Campaign): boolean {
    const now = new Date();
    const start = new Date(campaign.startDate);
    return now < start;
  }

  isCompleted(campaign: Campaign): boolean {
    const now = new Date();
    const end = new Date(campaign.endDate);
    return now > end;
  }

  calculateROI(campaign: Campaign): number {
    if (!campaign.budget || campaign.budget === 0) return 0;
    const revenue = (campaign.leadsGenerated || 0) * 50000; // Assuming avg deal value
    return ((revenue - campaign.budget) / campaign.budget) * 100;
  }

  calculateCostPerLead(campaign: Campaign): number {
    if (!campaign.leadsGenerated || campaign.leadsGenerated === 0) return 0;
    return (campaign.budget || 0) / campaign.leadsGenerated;
  }

  getDaysRemaining(campaign: Campaign): number {
    const now = new Date();
    const end = new Date(campaign.endDate);
    const diffMs = end.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

}

export const campaignsService = new CampaignsService();
