import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const dashboardApi = {
  getStats: (params?: { period?: string }) =>
    apiRequest<any>(withQuery("/api/dashboard/stats", params)),
  
  getRevenue: (params?: { range?: string; currency?: string }) =>
    apiRequest<any>(withQuery("/api/dashboard/revenue", params)),
  
  getLeadSources: (params?: { period?: string }) =>
    apiRequest<any>(withQuery("/api/dashboard/lead-sources", params)),
};