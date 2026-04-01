import { BaseController } from '../../core/base/BaseClasses.js';

/**
 * Landing Places Controller
 * Extends BaseController following Open/Closed Principle
 * Single Responsibility: HTTP request handling for landing places
 */
export class LandingPlacesController extends BaseController {
  constructor(service) {
    super(service);
  }

  /**
   * Extract filters from request
   * Override base method
   */
  extractFilters(req) {
    const filters = {};
    if (req.query.active !== undefined) {
      filters.is_active = req.query.active === 'true';
    }
    return filters;
  }

  /**
   * List active landing places
   * Additional endpoint beyond CRUD
   */
  listActive(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this.service.listActive();
      this.sendSuccess(res, data);
    })(req, res, next);
  }

  /**
   * Reorder landing places
   * Additional endpoint beyond CRUD
   */
  reorder(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const result = await this.service.reorder(req.body.items);
      this.sendSuccess(res, result);
    })(req, res, next);
  }
}
