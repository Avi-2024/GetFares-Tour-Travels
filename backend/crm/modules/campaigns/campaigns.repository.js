function createCampaignsRepository({ db, logger, schema }) {
  async function findAll(filters = {}) {
    return db.findMany(schema.tableName, filters);
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: "campaigns", payload }, "Creating record");
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: "campaigns", id, payload }, "Updating record");
    return db.update(schema.tableName, id, payload);
  }

  async function remove(id) {
    logger.debug({ module: "campaigns", id }, "Deleting record");
    await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
    return { id };
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    remove,
  });
}

export { createCampaignsRepository };
