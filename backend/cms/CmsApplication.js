import express from 'express';
import cors from 'cors';
import { Configuration } from './core/config/Configuration.js';
import { createDatabaseConnection } from '../crm/core/database/connection.js';
import { createLogger } from '../crm/core/logger/logger.js';
import { ErrorHandler } from './core/errors/Errors.js';
import { LandingPlacesModule } from './modules/landing/LandingPlaces.module.js';

/**
 * CMS Application Class
 * Single Responsibility: Application composition and lifecycle
 * Implements Dependency Injection for all modules
 */
export class CmsApplication {
  constructor() {
    this._config = Configuration.getInstance();
    this._app = express();
    this._logger = null;
    this._database = null;
    this._modules = {};
    this._isInitialized = false;
  }

  /**
   * Initialize application
   * Template method pattern
   */
  async initialize() {
    if (this._isInitialized) {
      throw new Error('Application already initialized');
    }

    // Validate configuration
    const validation = this._config.validate();
    if (!validation.isValid) {
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
    }

    // Setup components
    this._setupLogger();
    await this._setupDatabase();
    this._setupMiddleware();
    this._setupModules();
    this._setupRoutes();
    this._setupErrorHandling();

    this._isInitialized = true;
    this._logger.info('CMS Application initialized successfully');
  }

  /**
   * Setup logger
   */
  _setupLogger() {
    this._logger = createLogger({ name: 'cms' });
  }

  /**
   * Setup database connection
   */
  async _setupDatabase() {
    this._database = createDatabaseConnection({
      config: {
        env: this._config.env,
        database: this._config.database,
      },
      logger: this._logger,
    });

    // Test connection
    try {
      await this._database.healthCheck({ timeoutMs: 5000 });
      this._logger.info('Database connection established');
    } catch (error) {
      this._logger.error('Database connection failed', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  _setupMiddleware() {
    // CORS
    this._app.use(cors(this._config.cors));

    // Body parsers
    this._app.use(express.json({ limit: '10mb' }));
    this._app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this._app.use((req, res, next) => {
      this._logger.info({
        method: req.method,
        path: req.path,
        query: req.query,
      });
      next();
    });
  }

  /**
   * Setup all modules
   * Dependency Injection
   */
  _setupModules() {
    this._modules.landing = LandingPlacesModule.create(
      this._database,
      this._logger
    );

    // Add more modules here as they are created
    // this._modules.destinations = DestinationsModule.create(this._database, this._logger);
    // this._modules.packages = PackagesModule.create(this._database, this._logger);
    // this._modules.visa = VisaModule.create(this._database, this._logger);
  }

  /**
   * Setup routes
   */
  _setupRoutes() {
    // Health check
    this._app.get('/health', this._handleHealthCheck.bind(this));

    // CMS API Routes
    this._app.use('/api/cms/landing-places', this._modules.landing.routes);

    // Public API Routes
    this._app.get('/api/public/landing/places', this._handlePublicLandingPlaces.bind(this));
  }

  /**
   * Setup error handling
   */
  _setupErrorHandling() {
    this._app.use(ErrorHandler.notFound);
    this._app.use(ErrorHandler.handle);
  }

  /**
   * Health check handler
   */
  async _handleHealthCheck(req, res) {
    try {
      const dbHealth = await this._database.healthCheck({ timeoutMs: 5000 });
      res.json({
        success: true,
        status: 'healthy',
        database: dbHealth,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Public landing places handler
   */
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

  /**
   * Start server
   */
  async start() {
    if (!this._isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      const server = this._app.listen(this._config.port, () => {
        this._logger.info(`CMS API running on port ${this._config.port}`);
        this._logger.info(`Environment: ${this._config.env}`);
        this._logger.info(`Health check: http://localhost:${this._config.port}/health`);
        resolve(server);
      });
    });
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    this._logger.info('Shutting down CMS Application...');
    
    if (this._database) {
      await this._database.close();
      this._logger.info('Database connection closed');
    }

    this._logger.info('CMS Application shutdown complete');
  }

  // Getters
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

  /**
   * Static factory method
   */
  static create() {
    return new CmsApplication();
  }
}
