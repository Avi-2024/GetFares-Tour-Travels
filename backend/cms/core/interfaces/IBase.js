/**
 * Base Repository Interface
 * Defines contract for data access operations
 */
export class IRepository {
  async findAll(filters = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  async findById(id) {
    throw new Error('Method findById() must be implemented');
  }

  async create(data) {
    throw new Error('Method create() must be implemented');
  }

  async update(id, data) {
    throw new Error('Method update() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}

/**
 * Base Service Interface
 * Defines contract for business logic operations
 */
export class IService {
  async list(filters = {}) {
    throw new Error('Method list() must be implemented');
  }

  async getById(id) {
    throw new Error('Method getById() must be implemented');
  }

  async create(data) {
    throw new Error('Method create() must be implemented');
  }

  async update(id, data) {
    throw new Error('Method update() must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}

/**
 * Base Controller Interface
 * Defines contract for HTTP request handling
 */
export class IController {
  list(req, res, next) {
    throw new Error('Method list() must be implemented');
  }

  getById(req, res, next) {
    throw new Error('Method getById() must be implemented');
  }

  create(req, res, next) {
    throw new Error('Method create() must be implemented');
  }

  update(req, res, next) {
    throw new Error('Method update() must be implemented');
  }

  delete(req, res, next) {
    throw new Error('Method delete() must be implemented');
  }
}

/**
 * Database Interface
 * Defines contract for database operations
 */
export class IDatabase {
  async insert(tableName, data) {
    throw new Error('Method insert() must be implemented');
  }

  async findById(tableName, id) {
    throw new Error('Method findById() must be implemented');
  }

  async findOne(tableName, filters) {
    throw new Error('Method findOne() must be implemented');
  }

  async findMany(tableName, filters) {
    throw new Error('Method findMany() must be implemented');
  }

  async update(tableName, id, data) {
    throw new Error('Method update() must be implemented');
  }

  async query(sql, params) {
    throw new Error('Method query() must be implemented');
  }

  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }

  async close() {
    throw new Error('Method close() must be implemented');
  }
}

/**
 * Logger Interface
 * Defines contract for logging operations
 */
export class ILogger {
  info(message, meta) {
    throw new Error('Method info() must be implemented');
  }

  error(message, meta) {
    throw new Error('Method error() must be implemented');
  }

  warn(message, meta) {
    throw new Error('Method warn() must be implemented');
  }

  debug(message, meta) {
    throw new Error('Method debug() must be implemented');
  }
}
