import express from "express";

export class LandingPlacesRouter {
  constructor(controller) {
    if (!controller) {
      throw new Error("Controller is required");
    }
    this._controller = controller;
    this._router = express.Router();
    this._setupRoutes();
  }

  get router() {
    return this._router;
  }

  _setupRoutes() {
    this._router
      .route("/")
      .get(this._controller.list.bind(this._controller))
      .post(this._controller.create.bind(this._controller));

    this._router
      .route("/active")
      .get(this._controller.listActive.bind(this._controller));

    this._router
      .route("/reorder")
      .patch(this._controller.reorder.bind(this._controller));

    this._router
      .route("/:id")
      .get(this._controller.getById.bind(this._controller))
      .put(this._controller.update.bind(this._controller))
      .delete(this._controller.delete.bind(this._controller));
  }
  getRouter() {
    return this._router;
  }
}
