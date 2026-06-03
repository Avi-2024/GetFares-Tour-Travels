import { apiRequest } from "./apiClient";
import { withQuery } from "./query";

export const reportsApi = {
  leadFilterOptions: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/filters/lead-options", params)),
  getExecutiveKpis: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/dashboard/executive-kpis", params)),
  dashboardExecutiveKpis: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/dashboard/executive-kpis", params)),
  funnelConversion: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/funnel/conversion", params)),
  revenueMonthly: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/revenue/monthly", params)),
  revenueByServiceType: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/revenue/by-service-type", params)),
  revenueByDestination: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/revenue/by-destination", params)),
  targetVsAchievement: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/sales/target-vs-achievement", params)),
  leadsBySource: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/by-source", params)),
  leadsByConsultant: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/by-consultant", params)),
  peoplePerformance: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/people/performance", params)),
  getPeoplePerformance: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/people/performance", params)),
  quotationPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/quotations/performance", params)),
  getQuotationPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/quotations/performance", params)),
  bookingPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/bookings/performance", params)),
  getBookingPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/bookings/performance", params)),
  financeSummary: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/finance/summary", params)),
  getFinanceSummary: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/finance/summary", params)),
  operationsPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/operations/performance", params)),
  getOperationsPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/operations/performance", params)),
  leadsDealLines: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/deal-lines", params)),
  outstandingPayments: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/payments/outstanding", params)),
  paymentMode: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/payments/mode", params)),
  profitMargin: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/profit/margin", params)),
  financeCostBreakup: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/finance/cost-breakup", params)),
  financeSupplierServices: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/finance/supplier-services", params)),
  visaSummary: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/visa/summary", params)),
  marketingPerformance: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/marketing/performance", params)),
  getMarketingPerformance: (
    params?: Record<string, string | number | boolean>,
  ) => apiRequest(withQuery("/api/reports/marketing/performance", params)),
  supplierPerformance: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/suppliers/performance", params)),
  pipelineForecast: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/forecast/pipeline", params)),
  followupsToday: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/followups/today", params)),
  followupsMissed: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/followups/missed", params)),
  callLog: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/followups/call-log", params)),
  activityFeed: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/activities/feed", params)),
  getConversionFunnel: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/funnel/conversion", params)),
  getRevenueMonthly: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/revenue/monthly", params)),
  getLeadsBySource: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/by-source", params)),
  getLeadsAging: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/aging", params)),
  getLeadsLost: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/leads/lost", params)),
  monthlySummary: (params?: Record<string, string | number | boolean>) =>
    apiRequest(withQuery("/api/reports/monthly-summary", params)),
};
