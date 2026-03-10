class ComplaintsRepository {
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
    this.logger.debug({ module: 'complaints', payload }, 'Creating record');
    return this.db.insert(this.schema.tableName, payload);
  }

  async update(id, payload) {
    this.logger.debug({ module: 'complaints', id, payload }, 'Updating record');
    return this.db.update(this.schema.tableName, id, payload);
  }

  async findActivities(complaintId, filters = {}) {
    return this.db.findMany(this.schema.activitiesTable, {
      complaint_id: complaintId,
      ...filters,
    });
  }

  async createActivity(payload) {
    this.logger.debug({ module: 'complaints', payload }, 'Creating complaint activity');
    return this.db.insert(this.schema.activitiesTable, payload);
  }
}

module.exports = { ComplaintsRepository };
