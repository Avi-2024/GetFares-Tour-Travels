import express from 'express';

/**
 * Landing Places Router
 * Single Responsibility: Route configuration
 */
export class LandingPlacesRouter {
  constructor(controller) {
    if (!controller) {
      throw new Error('Controller is required');
    }
    this._controller = controller;
    this._router = express.Router();
    this._setupRoutes();
  }

  get router() {
    return this._router;
  }

  /**
   * Setup all routes
   * Private method following encapsulation
   */
  _setupRoutes() {
    // GET routes
    this._router.get('/', this._controller.list.bind(this._controller));
    this._router.get('/active', this._controller.listActive.bind(this._controller));
    this._router.get('/:id', this._controller.getById.bind(this._controller));

    // POST routes
    this._router.post('/', this._controller.create.bind(this._controller));

    // PUT routes
    this._router.put('/:id', this._controller.update.bind(this._controller));

    // PATCH routes
    this._router.patch('/reorder', this._controller.reorder.bind(this._controller));

    // DELETE routes
    this._router.delete('/:id', this._controller.delete.bind(this._controller));
  }

  /**
   * Get Express router instance
   */
  getRouter() {
    return this._router;
  }
}
