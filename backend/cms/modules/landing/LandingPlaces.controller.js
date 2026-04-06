import { BaseController } from "../../core/base/BaseClasses.js";

export class LandingPlacesController extends BaseController {
  constructor(service) {
    super(service);
  }

  extractFilters(req) {
    const filters = {};
    if (req.query.active !== undefined) {
      filters.is_active = req.query.active === "true";
    }
    return filters;
  }

  listActive(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this.service.listActive();
      this.sendSuccess(res, data);
    })(req, res, next);
  }

  reorder(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const result = await this.service.reorder(req.body.items);
      this.sendSuccess(res, result);
    })(req, res, next);
  }
}
