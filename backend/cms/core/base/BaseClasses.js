import { IRepository, IService, IController } from '../interfaces/IBase.js';

/**
 * Abstract Base Repository
 * Implements common repository patterns
 * Open for extension, closed for modification
 */
export class BaseRepository extends IRepository {
  constructor(database, schema) {
    super();
    if (!database) {
      throw new Error('Database instance is required');
    }
    if (!schema || !schema.tableName) {
      throw new Error('Schema with tableName is required');
    }
    this._db = database;
    this._schema = schema;
  }

  get db() {
    return this._db;
  }

  get schema() {
    return this._schema;
  }

  get tableName() {
    return this._schema.tableName;
  }

  async findAll(filters = {}) {
    return this._db.findMany(this.tableName, filters);
  }

  async findById(id) {
    return this._db.findById(this.tableName, id);
  }

  async findOne(filters) {
    return this._db.findOne(this.tableName, filters);
  }

  async create(data) {
    return this._db.insert(this.tableName, data);
  }

  async update(id, data) {
    return this._db.update(this.tableName, id, data);
  }

  async delete(id) {
    return this._db.update(this.tableName, id, { is_deleted: true });
  }

  async softDelete(id) {
    return this._db.update(this.tableName, id, { is_active: false });
  }

  async hardDelete(id) {
    const existing = await this._db.findById(this.tableName, id);
    if (!existing) {
      return null;
    }
    await this._db.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    return existing;
  }
}

/**
 * Abstract Base Service
 * Implements common business logic patterns
 * Single Responsibility: Business logic only
 */
export class BaseService extends IService {
  constructor(repository, logger = null) {
    super();
    if (!repository) {
      throw new Error('Repository instance is required');
    }
    this._repository = repository;
    this._logger = logger || console;
  }

  get repository() {
    return this._repository;
  }

  get logger() {
    return this._logger;
  }

  /**
   * Template method for entity transformation
   * Subclasses must implement this
   */
  toEntity(row) {
    throw new Error('Method toEntity() must be implemented by subclass');
  }

  async list(filters = {}) {
    const rows = await this._repository.findAll(filters);
    return rows.map((row) => this.toEntity(row));
  }

  async getById(id) {
    const row = await this._repository.findById(id);
    if (!row) {
      throw this.createNotFoundError();
    }
    return this.toEntity(row);
  }

  async create(data) {
    const validated = this.validateCreate(data);
    const row = await this._repository.create(validated);
    return this.toEntity(row);
  }

  async update(id, data) {
    await this.getById(id); // Verify exists
    const validated = this.validateUpdate(data);
    const row = await this._repository.update(id, validated);
    return this.toEntity(row);
  }

  async delete(id) {
    await this.getById(id); // Verify exists
    await this._repository.delete(id);
    return { success: true };
  }

  /**
   * Hook methods for validation
   * Subclasses can override
   */
  validateCreate(data) {
    return data;
  }

  validateUpdate(data) {
    return data;
  }

  /**
   * Factory method for creating errors
   */
  createNotFoundError() {
    const AppError = this.getAppErrorClass();
    return new AppError(404, 'Resource not found', 'NOT_FOUND');
  }

  createValidationError(message) {
    const AppError = this.getAppErrorClass();
    return new AppError(400, message, 'VALIDATION_ERROR');
  }

  getAppErrorClass() {
    // Import dynamically to avoid circular dependency
    return class AppError extends Error {
      constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
      }
    };
  }
}

/**
 * Abstract Base Controller
 * Implements common HTTP handling patterns
 * Dependency Inversion: Depends on abstractions (IService)
 */
export class BaseController extends IController {
  constructor(service) {
    super();
    if (!service) {
      throw new Error('Service instance is required');
    }
    this._service = service;
  }

  get service() {
    return this._service;
  }

  /**
   * Async handler wrapper
   * Follows DRY principle
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn.call(this, req, res, next)).catch(next);
    };
  }

  /**
   * Standard response formatter
   */
  sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  sendError(res, error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }

  list(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const filters = this.extractFilters(req);
      const data = await this._service.list(filters);
      this.sendSuccess(res, data);
    })(req, res, next);
  }

  getById(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this._service.getById(req.params.id);
      this.sendSuccess(res, data);
    })(req, res, next);
  }

  create(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this._service.create(req.body);
      this.sendSuccess(res, data, 201);
    })(req, res, next);
  }

  update(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const data = await this._service.update(req.params.id, req.body);
      this.sendSuccess(res, data);
    })(req, res, next);
  }

  delete(req, res, next) {
    return this.asyncHandler(async (req, res) => {
      const result = await this._service.delete(req.params.id);
      this.sendSuccess(res, result);
    })(req, res, next);
  }

  /**
   * Hook method for extracting filters
   * Subclasses can override
   */
  extractFilters(req) {
    return req.query;
  }
}
