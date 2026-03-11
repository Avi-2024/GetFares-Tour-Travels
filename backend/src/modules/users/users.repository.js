function createUsersRepository({ db, logger, schema }) {
  return Object.freeze({
    findAll(filters = {}) {
      return db.findMany(schema.tableName, filters);
    },

    findById(id) {
      return db.findById(schema.tableName, id);
    },

    create(payload) {
      logger.debug({ module: 'users', payload }, 'Creating record');
      return db.insert(schema.tableName, payload);
    },

    update(id, payload) {
      logger.debug({ module: 'users', id, payload }, 'Updating record');
      return db.update(schema.tableName, id, payload);
    },
  });
}

module.exports = { createUsersRepository };
