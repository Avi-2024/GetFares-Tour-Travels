/**
 * Reports Service
 * Business logic layer for reporting and analytics
 */

import { reportsEndpoints } from '../endpoints/reports.api';

export class ReportsService {
  // Sales Reports
  async salesOverview(params?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const response = await reportsEndpoints.salesOverview(params);
    return response.data;
  }

  async salesByAgent(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.salesByAgent(params);
    return response.data;
  }

  async salesByDestination(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.salesByDestination(params);
    return response.data;
  }

  // Lead Reports
  async leadsOverview(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.leadsOverview(params);
    return response.data;
  }

  async leadConversion(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.leadConversion(params);
    return response.data;
  }

  async leadsBySource(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.leadsBySource(params);
    return response.data;
  }

  // Revenue Reports
  async revenueOverview(params?: { startDate?: string; endDate?: string; groupBy?: string }) {
    const response = await reportsEndpoints.revenueOverview(params);
    return response.data;
  }

  async profitMargins(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.profitMargins(params);
    return response.data;
  }

  // Performance Reports
  async agentPerformance(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.agentPerformance(params);
    return response.data;
  }

  async teamPerformance(params?: { startDate?: string; endDate?: string }) {
    const response = await reportsEndpoints.teamPerformance(params);
    return response.data;
  }

  // Export Reports
  async exportSales(params?: Record<string, any>) {
    const blob = await reportsEndpoints.exportSales(params);
    this.downloadBlob(blob, 'sales-report.xlsx');
  }

  async exportLeads(params?: Record<string, any>) {
    const blob = await reportsEndpoints.exportLeads(params);
    this.downloadBlob(blob, 'leads-report.xlsx');
  }

  async exportRevenue(params?: Record<string, any>) {
    const blob = await reportsEndpoints.exportRevenue(params);
    this.downloadBlob(blob, 'revenue-report.xlsx');
  }

  // Helper methods
  getDateRangePresets(): { label: string; value: { startDate: string; endDate: string } }[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    
    const yearStart = new Date(today);
    yearStart.setFullYear(yearStart.getFullYear() - 1);

    return [
      {
        label: 'Today',
        value: {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Yesterday',
        value: {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0],
        },
      },
      {
        label: 'Last 7 Days',
        value: {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Last 30 Days',
        value: {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
      {
        label: 'Last Year',
        value: {
          startDate: yearStart.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        },
      },
    ];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  getGrowthColor(growth: number): string {
    if (growth > 0) return 'green';
    if (growth < 0) return 'red';
    return 'gray';
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

export const reportsService = new ReportsService();
