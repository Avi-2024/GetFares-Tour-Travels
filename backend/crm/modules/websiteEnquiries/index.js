import { createWebsiteEnquiriesController } from "./websiteEnquiries.controller.js";
import { createWebsiteEnquiriesService } from "./websiteEnquiries.service.js";
import { createWebsiteEnquiriesRoutes } from "./websiteEnquiries.routes.js";
import { WebsiteEnquiriesValidation } from "./websiteEnquiries.validation.js";

function createWebsiteEnquiriesModule({ dependencies, leadsService }) {
  if (!leadsService) {
    throw new Error("Website enquiries module requires leadsService dependency");
  }

  const service = createWebsiteEnquiriesService({ leadsService });
  const controller = createWebsiteEnquiriesController({ service });
  const router = createWebsiteEnquiriesRoutes({
    controller,
    validation: WebsiteEnquiriesValidation,
    validateRequest: dependencies.middlewares.validateRequest,
  });

  return Object.freeze({
    name: "websiteEnquiries",
    router,
    controller,
    service,
  });
}

export { createWebsiteEnquiriesModule };
