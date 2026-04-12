import dotenv from 'dotenv';

/**
 * Configuration Class
 * Implements Singleton pattern
 * Single Responsibility: Application configuration
 */
export class Configuration {
  static _instance = null;

  constructor() {
    if (Configuration._instance) {
      return Configuration._instance;
    }

    dotenv.config();
    this._loadConfiguration();
    Configuration._instance = this;
  }

  /**
   * Load configuration from environment
   * Private method following encapsulation
   */
  _loadConfiguration() {
    this._env = process.env.NODE_ENV || 'development';
    this._port = parseInt(process.env.PORT || '3000', 10);

    this._database = {
      client: process.env.DATABASE_CLIENT,
      url: process.env.DATABASE_URL,
      mysql: {
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      },
    };

    this._jwt = {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    };

    this._cors = {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    };

    this._upload = {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      allowedVideoTypes: ['video/mp4', 'video/webm'],
    };

    this._cache = {
      enabled: process.env.CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
      redisUrl: process.env.REDIS_URL,
    };

    this._storage = {
      type: process.env.STORAGE_TYPE || 'local',
      azureBlob: {
        container: process.env.AZURE_STORAGE_CONTAINER,
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      },
      local: {
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
      },
    };
  }

  // Getters
  get env() {
    return this._env;
  }

  get port() {
    return this._port;
  }

  get database() {
    return this._database;
  }

  get jwt() {
    return this._jwt;
  }

  get cors() {
    return this._cors;
  }

  get upload() {
    return this._upload;
  }

  get cache() {
    return this._cache;
  }

  get storage() {
    return this._storage;
  }

  get isDevelopment() {
    return this._env === 'development';
  }

  get isProduction() {
    return this._env === 'production';
  }

  get isTest() {
    return this._env === 'test';
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    const dbClient = String(this._database.client || '')
      .trim()
      .toLowerCase();
    const mysqlHostConfigured = Boolean(this._database.mysql.host);

    if (!this._database.url && !mysqlHostConfigured) {
      errors.push('DATABASE_URL or MYSQL_HOST is required');
    }

    if (dbClient === 'mysql' && !this._database.url && !mysqlHostConfigured) {
      errors.push('MySQL config missing. Set DATABASE_URL or MYSQL_HOST.');
    }

    if (this.isProduction && this._jwt.secret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be changed in production');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!Configuration._instance) {
      Configuration._instance = new Configuration();
    }
    return Configuration._instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset() {
    Configuration._instance = null;
  }
}
