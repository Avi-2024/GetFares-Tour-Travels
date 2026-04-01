function createVisaRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      return db.findMany(schema.tableName, filters);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async findBySlug(slug) {
      return db.findOne(schema.tableName, { slug });
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

    // Details methods
    async findDetails(visaDestinationId, sectionType = null) {
      const filters = { visa_destination_id: visaDestinationId };
      if (sectionType) filters.section_type = sectionType;
      return db.findMany(schema.detailsTable, filters);
    },

    async findDetailById(detailId) {
      return db.findById(schema.detailsTable, detailId);
    },

    async createDetail(data) {
      return db.insert(schema.detailsTable, data);
    },

    async updateDetail(detailId, data) {
      return db.update(schema.detailsTable, detailId, data);
    },

    async deleteDetail(detailId) {
      const result = await db.query(
        `DELETE FROM ${schema.detailsTable} WHERE id = $1 RETURNING *`,
        [detailId],
      );
      return result.rows[0] || null;
    },
  });
}

export { createVisaRepository };
