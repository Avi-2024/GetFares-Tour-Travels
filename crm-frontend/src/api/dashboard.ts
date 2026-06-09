import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const dashboardApi = {
  getStats: (params?: {
    period?: string
    currency?: string
    country?: string
    market?: string
    region?: string
    date?: string
    from?: string
    to?: string
  }) =>
    apiRequest<any>(withQuery("/api/dashboard/stats", params)),
  
  getRevenue: (params?: {
    range?: string
    currency?: string
    country?: string
    market?: string
    region?: string
    date?: string
    from?: string
    to?: string
  }) =>
    apiRequest<any>(withQuery("/api/dashboard/revenue", params)),
  
  getLeadSources: (params?: {
    period?: string
    country?: string
    market?: string
    region?: string
  }) =>
    apiRequest<any>(withQuery("/api/dashboard/lead-sources", params)),
};
