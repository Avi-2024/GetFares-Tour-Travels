function createCampaignsRepository({ db, logger, schema }) {
  return Object.freeze({
    findAll(filters = {}) {
      return db.findMany(schema.tableName, filters);
    },

    findById(id) {
      return db.findById(schema.tableName, id);
    },

    create(payload) {
      logger.debug({ module: 'campaigns', payload }, 'Creating record');
      return db.insert(schema.tableName, payload);
    },

    update(id, payload) {
      logger.debug({ module: 'campaigns', id, payload }, 'Updating record');
      return db.update(schema.tableName, id, payload);
    },
  });
}

module.exports = { createCampaignsRepository };
