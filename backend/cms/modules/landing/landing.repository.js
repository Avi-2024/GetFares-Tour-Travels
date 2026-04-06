function createLandingRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (filters.active !== undefined) {
        query.is_active = filters.active;
        delete query.active;
      }
      return db.findMany(schema.tableName, query);
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

    async delete(id) {
      return db.update(schema.tableName, id, { is_active: false });
    },

    async updateOrder(items) {
      const promises = items.map(({ id, displayOrder }) =>
        db.update(schema.tableName, id, { display_order: displayOrder }),
      );
      return Promise.all(promises);
    },
  });
}

export { createLandingRepository };
