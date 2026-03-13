function createCampaignsRepository({ db, logger, schema }) {
  async function findAll(filters = {}) {
    return db.findMany(schema.tableName, filters);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: 'campaigns', payload }, 'Creating record');
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: 'campaigns', id, payload }, 'Updating record');
    return db.update(schema.tableName, id, payload);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
  });
}

module.exports = { createCampaignsRepository };
