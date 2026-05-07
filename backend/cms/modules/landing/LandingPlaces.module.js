import { LandingPlacesRepository } from "./LandingPlaces.repository.js";
import { LandingPlacesService } from "./LandingPlaces.service.js";
import { LandingPlacesController } from "./LandingPlaces.controller.js";
import { LandingPlacesRouter } from "./LandingPlaces.routes.js";

export class LandingPlacesModule {
  constructor(database, logger = null) {
    if (!database) {
      throw new Error("Database instance is required");
    }

    this._repository = new LandingPlacesRepository(database);
    this._service = new LandingPlacesService(this._repository, logger);
    this._controller = new LandingPlacesController(this._service);
    this._router = new LandingPlacesRouter(this._controller);
  }

  get repository() {
    return this._repository;
  }

  get service() {
    return this._service;
  }

  get controller() {
    return this._controller;
  }

  get router() {
    return this._router.router;
  }

  get routes() {
    return this._router.router;
  }

  static create(database, logger = null) {
    return new LandingPlacesModule(database, logger);
  }
}
