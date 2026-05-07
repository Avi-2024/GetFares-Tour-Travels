function createCmsMediaRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (query.is_deleted === undefined) {
        query.is_deleted = false;
      }
      return db.findMany(schema.tableName, query);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async create(data) {
      return db.insert(schema.tableName, { ...data, is_deleted: false });
    },

    async update(id, data) {
      return db.update(schema.tableName, id, data);
    },

    async delete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.tableName, id, { is_deleted: true });
      return db.findById(schema.tableName, id);
    },

    async hardDelete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async deactivate(id) {
      return this.delete(id);
    },
  });
}

export { createCmsMediaRepository };
