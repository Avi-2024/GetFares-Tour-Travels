function createCountriesRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (query.is_active === undefined) {
        query.is_active = true;
      }
      const rows = await db.findMany(schema.tableName, query);
      return rows.sort((a, b) => a.display_order - b.display_order);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async findByCode(code) {
      return db.findOne(schema.tableName, { code: code.toUpperCase() });
    },

    async findByName(name) {
      return db.findOne(schema.tableName, { name });
    },

    async findByIds(ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return [];
      }
      const placeholders = ids.map(() => '?').join(',');
      const result = await db.query(
        `SELECT * FROM ${schema.tableName} WHERE id IN (${placeholders})`,
        ids
      );
      return result.rows || [];
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
  });
}

export { createCountriesRepository };
