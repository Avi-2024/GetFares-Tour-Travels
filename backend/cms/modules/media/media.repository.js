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

    async delete(id) {
      const result = await db.query(
        `DELETE FROM ${schema.tableName} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },

    async deactivate(id) {
      return this.delete(id);
    },
  });
}

export { createCmsMediaRepository };
