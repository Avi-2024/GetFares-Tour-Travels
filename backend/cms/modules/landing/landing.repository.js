function createLandingRepository({ db, schema }) {
  let countryColumnSupported = null;

  async function supportsCountryColumn() {
    if (countryColumnSupported !== null) {
      return countryColumnSupported;
    }

    if (db?.adapter === "in-memory" || typeof db?.query !== "function") {
      countryColumnSupported = true;
      return countryColumnSupported;
    }

    try {
      const result = await db.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = 'country'
         LIMIT 1`,
        [schema.tableName],
      );
      countryColumnSupported =
        (result?.rowCount ?? result?.rows?.length ?? 0) > 0;
    } catch {
      countryColumnSupported = false;
    }

    return countryColumnSupported;
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (filters.active !== undefined) {
        query.is_active = filters.active;
        delete query.active;
      }
      if (!(await supportsCountryColumn())) {
        delete query.country;
      }
      return db.findMany(schema.tableName, query);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async create(data) {
      const payload = { ...data };
      if (!(await supportsCountryColumn())) {
        delete payload.country;
      }
      return db.insert(schema.tableName, payload);
    },

    async update(id, data) {
      const payload = { ...data };
      if (!(await supportsCountryColumn())) {
        delete payload.country;
      }
      return db.update(schema.tableName, id, payload);
    },

    async delete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async updateOrder(items) {
      const promises = items.map(({ id, displayOrder }) =>
        db.update(schema.tableName, id, { display_order: displayOrder }),
      );
      return Promise.all(promises);
    },

    async supportsCountry() {
      return supportsCountryColumn();
    },
  });
}

export { createLandingRepository };
