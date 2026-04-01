/**
 * Reports API
 * Handles reporting and analytics operations
 */

import { apiClient, withQuery } from '../core';

export interface ReportData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export const reportsEndpoints = {
  // Sales Reports
  salesOverview: (params?: { startDate?: string; endDate?: string; groupBy?: string }) =>
    apiClient.get<{ data: ReportData }>(withQuery('/api/reports/sales/overview', params)),

  salesByAgent: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any[] }>(withQuery('/api/reports/sales/by-agent', params)),

  salesByDestination: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any[] }>(withQuery('/api/reports/sales/by-destination', params)),

  // Lead Reports
  leadsOverview: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: ReportData }>(withQuery('/api/reports/leads/overview', params)),

  leadConversion: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any }>(withQuery('/api/reports/leads/conversion', params)),

  leadsBySource: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any[] }>(withQuery('/api/reports/leads/by-source', params)),

  // Revenue Reports
  revenueOverview: (params?: { startDate?: string; endDate?: string; groupBy?: string }) =>
    apiClient.get<{ data: ReportData }>(withQuery('/api/reports/revenue/overview', params)),

  profitMargins: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any }>(withQuery('/api/reports/revenue/profit-margins', params)),

  // Performance Reports
  agentPerformance: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any[] }>(withQuery('/api/reports/performance/agents', params)),

  teamPerformance: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<{ data: any[] }>(withQuery('/api/reports/performance/teams', params)),

  // Export Reports
  exportSales: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/reports/export/sales', params), { responseType: 'blob' }),

  exportLeads: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/reports/export/leads', params), { responseType: 'blob' }),

  exportRevenue: (params?: Record<string, any>) =>
    apiClient.get(withQuery('/api/reports/export/revenue', params), { responseType: 'blob' }),
};
