const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createReportsRoutes({ controller, validation, validateRequest, requireAuth, authorize }) {
  const router = Router();

  router.get('/leads/by-source', requireAuth, authorize('reports:read'), validateRequest(validation.bySource), asyncHandler(controller.leadsBySource));
  router.get('/leads/by-consultant', requireAuth, authorize('reports:read'), validateRequest(validation.byConsultant), asyncHandler(controller.leadsByConsultant));
  router.get('/leads/aging', requireAuth, authorize('reports:read'), validateRequest(validation.leadAging), asyncHandler(controller.leadAging));
  router.get('/leads/lost', requireAuth, authorize('reports:read'), validateRequest(validation.lostLeads), asyncHandler(controller.lostLeads));

  router.get('/revenue/monthly', requireAuth, authorize('reports:read'), validateRequest(validation.monthlyRevenue), asyncHandler(controller.revenueByMonth));
  router.get('/revenue/by-service-type', requireAuth, authorize('reports:read'), validateRequest(validation.byServiceType), asyncHandler(controller.revenueByServiceType));
  router.get('/revenue/by-destination', requireAuth, authorize('reports:read'), validateRequest(validation.byDestination), asyncHandler(controller.revenueByDestination));

  router.get('/sales/target-vs-achievement', requireAuth, authorize('reports:read'), validateRequest(validation.targetVsAchievement), asyncHandler(controller.targetVsAchievement));

  router.get('/payments/outstanding', requireAuth, authorize('reports:read'), validateRequest(validation.outstandingPayments), asyncHandler(controller.outstandingPayments));
  router.get('/payments/mode', requireAuth, authorize('reports:read'), validateRequest(validation.paymentMode), asyncHandler(controller.paymentMode));
  router.get('/profit/margin', requireAuth, authorize('reports:read'), validateRequest(validation.profitMargin), asyncHandler(controller.profitMargin));

  router.get('/visa/summary', requireAuth, authorize('reports:read'), validateRequest(validation.visaSummary), asyncHandler(controller.visaSummary));

  router.get('/followups/today', requireAuth, authorize('reports:read'), validateRequest(validation.followupsToday), asyncHandler(controller.followupsToday));
  router.get('/followups/missed', requireAuth, authorize('reports:read'), validateRequest(validation.followupsMissed), asyncHandler(controller.followupsMissed));
  router.get('/followups/call-log', requireAuth, authorize('reports:read'), validateRequest(validation.callLog), asyncHandler(controller.callLog));

  router.get('/monthly-summary', requireAuth, authorize('reports:read'), validateRequest(validation.monthlySummary), asyncHandler(controller.monthlySummary));
  router.get('/dashboard/executive-kpis', requireAuth, authorize('reports:read'), validateRequest(validation.executiveKpis), asyncHandler(controller.executiveKpis));
  router.get('/funnel/conversion', requireAuth, authorize('reports:read'), validateRequest(validation.conversionFunnel), asyncHandler(controller.conversionFunnel));
  router.get('/marketing/performance', requireAuth, authorize('reports:read'), validateRequest(validation.marketingPerformance), asyncHandler(controller.marketingPerformance));
  router.get('/suppliers/performance', requireAuth, authorize('reports:read'), validateRequest(validation.supplierPerformance), asyncHandler(controller.supplierPerformance));
  router.get('/forecast/pipeline', requireAuth, authorize('reports:read'), validateRequest(validation.pipelineForecast), asyncHandler(controller.pipelineForecast));

  return router;
}

module.exports = { createReportsRoutes };
