function createComplaintsRepository({ db, logger, schema }) {
  async function findAll(filters = {}) {
    return db.findMany(schema.tableName, filters);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: 'complaints', payload }, 'Creating record');
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: 'complaints', id, payload }, 'Updating record');
    return db.update(schema.tableName, id, payload);
  }

  async function findActivities(complaintId, filters = {}) {
    return db.findMany(schema.activitiesTable, {
      complaint_id: complaintId,
      ...filters,
    });
  }

  async function createActivity(payload) {
    logger.debug({ module: 'complaints', payload }, 'Creating complaint activity');
    return db.insert(schema.activitiesTable, payload);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findActivities,
    createActivity,
  });
}

module.exports = { createComplaintsRepository };
