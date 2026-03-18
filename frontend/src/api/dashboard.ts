import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export interface DashboardStats {
  totalLeads: number;
  totalLeadsChange: number;
  revenue: number;
  revenueChange: number;
  pendingCalls: number;
  pendingCallsChange: number;
  bookings: number;
  bookingsChange: number;
}

export interface RevenueData {
  name: string;
  revenue: number;
  last: number;
}

export interface LeadSource {
  name: string;
  value: number;
}

export const dashboardApi = {
  getStats: (params?: { period?: string }) =>
    apiRequest(withQuery("/api/dashboard/stats", params)),
  
  getRevenue: (params?: { range?: string }) =>
    apiRequest(withQuery("/api/dashboard/revenue", params)),
  
  getLeadSources: (params?: { period?: string }) =>
    apiRequest(withQuery("/api/dashboard/lead-sources", params)),
  
  // Test function with mock data fallback
  testWithFallback: async (token?: string) => {
    try {
      console.log('Testing dashboard API with token:', !!token);
      const stats = await dashboardApi.getStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error('Dashboard API test failed:', error);
      return {
        success: false,
        error,
        fallbackData: {
          stats: {
            totalLeads: 1248,
            totalLeadsChange: 12,
            revenue: 84200,
            revenueChange: 9.4,
            pendingCalls: 12,
            pendingCallsChange: -4,
            bookings: 186,
            bookingsChange: 6
          }
        }
      };
    }
  }
};