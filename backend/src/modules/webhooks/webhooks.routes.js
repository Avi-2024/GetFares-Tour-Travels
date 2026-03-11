const { Router } = require('express');
const { asyncHandler } = require('../../core/utils');

function createWebhooksRoutes({ controller, validation, validateRequest }) {
  const router = Router();

  router.post('/meta-leads', validateRequest(validation.metaLead), asyncHandler(controller.metaLeads));
  router.post('/website-enquiry', validateRequest(validation.websiteEnquiry), asyncHandler(controller.websiteEnquiry));
  router.post('/whatsapp-enquiry', validateRequest(validation.whatsappEnquiry), asyncHandler(controller.whatsappEnquiry));

  return router;
}

module.exports = { createWebhooksRoutes };
