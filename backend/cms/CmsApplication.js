import express from "express";
import cors from "cors";
import { Configuration } from "./core/config/Configuration.js";
import { createDatabaseConnection } from "../crm/core/database/connection.js";
import { createLogger } from "../crm/core/logger/logger.js";
import { ErrorHandler } from "./core/errors/Errors.js";
import { LandingPlacesModule } from "./modules/landing/LandingPlaces.module.js";
import {
  requestContext,
  createRequestLoggingMiddleware,
} from "../crm/core/middlewares/index.js";

export class CmsApplication {
  constructor() {
    this._config = Configuration.getInstance();
    this._app = express();
    this._logger = null;
    this._database = null;
    this._modules = {};
    this._isInitialized = false;
  }

  async initialize() {
    if (this._isInitialized) {
      throw new Error("Application already initialized");
    }

    const validation = this._config.validate();
    if (!validation.isValid) {
      throw new Error(`Configuration errors: ${validation.errors.join(", ")}`);
    }

    this._setupLogger();
    await this._setupDatabase();
    this._setupMiddleware();
    this._setupModules();
    this._setupRoutes();
    this._setupErrorHandling();

    this._isInitialized = true;
    this._logger.info("CMS Application initialized successfully");
  }

  _setupLogger() {
    this._logger = createLogger({ name: "cms" });
  }

  async _setupDatabase() {
    this._database = createDatabaseConnection({
      config: {
        env: this._config.env,
        database: this._config.database,
      },
      logger: this._logger,
    });

    try {
      await this._database.healthCheck({ timeoutMs: 5000 });
      this._logger.info("Database connection established");
    } catch (error) {
      this._logger.error("Database connection failed", error);
      throw error;
    }
  }

  _setupMiddleware() {
    this._app.locals.logger = this._logger;
    this._app.use(cors(this._config.cors));
    this._app.use(express.json({ limit: "1gb" }));
    this._app.use(express.urlencoded({ extended: true, limit: "1gb" }));
    this._app.use(requestContext);
    this._app.use(createRequestLoggingMiddleware({ logger: this._logger }));
  }

  _setupModules() {
    this._modules.landing = LandingPlacesModule.create(
      this._database,
      this._logger,
    );
  }

  _setupRoutes() {
    this._app.get("/health", this._handleHealthCheck.bind(this));
    this._app.use("/api/cms/landing-places", this._modules.landing.routes);
    this._app.get(
      "/api/public/landing/places",
      this._handlePublicLandingPlaces.bind(this),
    );
  }

  _setupErrorHandling() {
    this._app.use(ErrorHandler.notFound);
    this._app.use(ErrorHandler.handle);
  }

  async _handleHealthCheck(req, res) {
    try {
      const dbHealth = await this._database.healthCheck({ timeoutMs: 5000 });
      res.json({
        success: true,
        status: "healthy",
        database: dbHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async _handlePublicLandingPlaces(req, res, next) {
    try {
      const places = await this._modules.landing.service.listActive();
      res.json({
        success: true,
        data: places,
      });
    } catch (error) {
      next(error);
    }
  }

  async start() {
    if (!this._isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      const server = this._app.listen(this._config.port, () => {
        this._logger.info(`CMS API running on port ${this._config.port}`);
        this._logger.info(`Environment: ${this._config.env}`);
        this._logger.info(
          `Health check: http://localhost:${this._config.port}/health`,
        );
        resolve(server);
      });
    });
  }

  async shutdown() {
    this._logger.info("Shutting down CMS Application...");

    if (this._database) {
      await this._database.close();
      this._logger.info("Database connection closed");
    }

    this._logger.info("CMS Application shutdown complete");
  }

  get app() {
    return this._app;
  }

  get config() {
    return this._config;
  }

  get logger() {
    return this._logger;
  }

  get database() {
    return this._database;
  }

  get modules() {
    return this._modules;
  }

  get isInitialized() {
    return this._isInitialized;
  }

  static create() {
    return new CmsApplication();
  }
}
