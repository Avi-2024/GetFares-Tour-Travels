function createComplaintsRepository({ db, logger, schema }) {
  return Object.freeze({
    findAll(filters = {}) {
      return db.findMany(schema.tableName, filters);
    },

    findById(id) {
      return db.findById(schema.tableName, id);
    },

    create(payload) {
      logger.debug({ module: 'complaints', payload }, 'Creating record');
      return db.insert(schema.tableName, payload);
    },

    update(id, payload) {
      logger.debug({ module: 'complaints', id, payload }, 'Updating record');
      return db.update(schema.tableName, id, payload);
    },
  });
}

module.exports = { createComplaintsRepository };
