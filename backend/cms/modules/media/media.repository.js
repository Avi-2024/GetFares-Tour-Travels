function createCmsMediaRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      return db.findMany(schema.tableName, filters);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async create(data) {
      return db.insert(schema.tableName, data);
    },

    async update(id, data) {
      return db.update(schema.tableName, id, data);
    },

    async deactivate(id) {
      return db.update(schema.tableName, id, { is_active: false });
    },
  });
}

export { createCmsMediaRepository };
