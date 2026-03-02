class CampaignsRepository {
  constructor({ db, logger, schema }) {
    this.db = db;
    this.logger = logger;
    this.schema = schema;
  }

  async findAll(filters = {}) {
    return this.db.findMany(this.schema.tableName, filters);
  }

  async findById(id) {
    return this.db.findById(this.schema.tableName, id);
  }

  async create(payload) {
    this.logger.debug({ module: 'campaigns', payload }, 'Creating record');
    return this.db.insert(this.schema.tableName, payload);
  }

  async update(id, payload) {
    this.logger.debug({ module: 'campaigns', id, payload }, 'Updating record');
    return this.db.update(this.schema.tableName, id, payload);
  }
}

module.exports = { CampaignsRepository };
