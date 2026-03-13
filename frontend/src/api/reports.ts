import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const reportsApi = {
  dashboardExecutiveKpis: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/dashboard/executive-kpis", params)),
  funnelConversion: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/funnel/conversion", params)),
  revenueMonthly: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/revenue/monthly", params)),
  leadsBySource: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/leads/by-source", params)),
  leadsByConsultant: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/leads/by-consultant", params)),
  outstandingPayments: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/payments/outstanding", params)),
  visaSummary: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/visa/summary", params)),
  marketingPerformance: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/marketing/performance", params)),
  supplierPerformance: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/suppliers/performance", params)),
  pipelineForecast: (params?: Record<string, string | number | boolean>) => apiRequest(withQuery("/api/reports/forecast/pipeline", params)),
};
