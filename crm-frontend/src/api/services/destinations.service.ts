/**
 * Destinations Service
 * Business logic layer for destination and pricing management
 */

import { destinationsEndpoints, type Destination, type CreateDestinationPayload, type CreatePricingPayload } from '../endpoints/destinations.api';

export class DestinationsService {
  async list(params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const response = await destinationsEndpoints.list(params);
    return response.data;
  }

  async getById(id: string) {
    const response = await destinationsEndpoints.getById(id);
    return response.data;
  }

  async create(payload: CreateDestinationPayload) {
    if (!payload.name || payload.name.trim().length === 0) {
      throw new Error('Destination name is required');
    }

    const response = await destinationsEndpoints.create(payload);
    return response.data;
  }

  async update(id: string, payload: Partial<CreateDestinationPayload>) {
    const response = await destinationsEndpoints.update(id, payload);
    return response.data;
  }

  async delete(id: string) {
    await destinationsEndpoints.delete(id);
  }

  async listPricing(destinationId: string) {
    const response = await destinationsEndpoints.listPricing(destinationId);
    return response.data;
  }

  async createPricing(destinationId: string, payload: CreatePricingPayload) {
    // Validate pricing
    if (payload.baseCost <= 0) {
      throw new Error('Base cost must be greater than 0');
    }
    if (payload.minProfitPercent < 0) {
      throw new Error('Minimum profit percent cannot be negative');
    }

    const response = await destinationsEndpoints.createPricing(destinationId, payload);
    return response.data;
  }

  async updatePricing(pricingId: string, payload: Partial<CreatePricingPayload>) {
    const response = await destinationsEndpoints.updatePricing(pricingId, payload);
    return response.data;
  }

  // Helper methods
  calculateSellingPrice(baseCost: number, profitPercent: number, taxPercent: number = 0): number {
    const profit = baseCost * (profitPercent / 100);
    const subtotal = baseCost + profit;
    const tax = subtotal * (taxPercent / 100);
    return subtotal + tax;
  }

  calculateMinPrice(baseCost: number, minProfitPercent: number, taxPercent: number = 0): number {
    return this.calculateSellingPrice(baseCost, minProfitPercent, taxPercent);
  }

  calculateRecommendedPrice(baseCost: number, recommendedProfitPercent: number, taxPercent: number = 0): number {
    return this.calculateSellingPrice(baseCost, recommendedProfitPercent, taxPercent);
  }

  isPricingValid(validFrom?: string, validTo?: string): boolean {
    if (!validFrom && !validTo) return true;
    
    const now = new Date();
    if (validFrom && new Date(validFrom) > now) return false;
    if (validTo && new Date(validTo) < now) return false;
    
    return true;
  }

  getCurrentPricing(pricings: any[]): any | null {
    const now = new Date();
    const valid = pricings.filter(p => {
      const validFrom = p.validFrom ? new Date(p.validFrom) : null;
      const validTo = p.validTo ? new Date(p.validTo) : null;
      
      if (validFrom && validFrom > now) return false;
      if (validTo && validTo < now) return false;
      
      return true;
    });

    // Return most recent valid pricing
    return valid.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0] || null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  getPopularDestinations(destinations: Destination[]): Destination[] {
    // This would typically come from analytics
    // For now, return active destinations
    return destinations.filter(d => d.isActive);
  }

  searchDestinations(destinations: Destination[], query: string): Destination[] {
    const lowerQuery = query.toLowerCase();
    return destinations.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) ||
      d.country?.toLowerCase().includes(lowerQuery)
    );
  }
}

export const destinationsService = new DestinationsService();
