function createSettingsRepository({ db, logger, schema }) {
  async function listAll() {
    return db.findMany(schema.tableName, {});
  }

  async function findByKey(key) {
    return db.findOne(schema.tableName, { key });
  }

  async function upsert(key, value, updatedBy = null) {
    const now = new Date().toISOString();
    const existing = await findByKey(key);

    if (existing) {
      logger.debug(
        { module: "settings", section: key },
        "Updating settings section",
      );
      const next = await db.update(schema.tableName, existing.id, {
        key,
        value,
        updated_by: updatedBy || existing.updated_by || null,
        updated_at: now,
      });
      return next || existing;
    }

    logger.debug(
      { module: "settings", section: key },
      "Creating settings section",
    );
    return db.insert(schema.tableName, {
      key,
      value,
      updated_by: updatedBy,
      created_at: now,
      updated_at: now,
    });
  }

  return Object.freeze({
    listAll,
    findByKey,
    upsert,
  });
}

export { createSettingsRepository };
