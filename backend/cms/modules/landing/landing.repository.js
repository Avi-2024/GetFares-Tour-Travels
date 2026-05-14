function createLandingRepository({ db, schema }) {
  let countryColumnSupported = null;
  let countryIdsColumnSupported = null;
  let isDeletedColumnSupported = null;
  let descriptionColumnSupported = null;

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

  async function supportsIsDeletedColumn() {
    if (isDeletedColumnSupported !== null) {
      return isDeletedColumnSupported;
    }

    if (db?.adapter === "in-memory" || typeof db?.query !== "function") {
      isDeletedColumnSupported = true;
      return isDeletedColumnSupported;
    }

    try {
      const result = await db.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = 'is_deleted'
         LIMIT 1`,
        [schema.tableName],
      );
      isDeletedColumnSupported =
        (result?.rowCount ?? result?.rows?.length ?? 0) > 0;
    } catch {
      isDeletedColumnSupported = false;
    }

    return isDeletedColumnSupported;
  }

  async function supportsCountryIdsColumn() {
    if (countryIdsColumnSupported !== null) {
      return countryIdsColumnSupported;
    }

    if (db?.adapter === "in-memory" || typeof db?.query !== "function") {
      countryIdsColumnSupported = true;
      return countryIdsColumnSupported;
    }

    try {
      const result = await db.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = 'country_ids'
         LIMIT 1`,
        [schema.tableName],
      );
      countryIdsColumnSupported =
        (result?.rowCount ?? result?.rows?.length ?? 0) > 0;
    } catch {
      countryIdsColumnSupported = false;
    }

    return countryIdsColumnSupported;
  }

  async function supportsDescriptionColumn() {
    if (descriptionColumnSupported !== null) {
      return descriptionColumnSupported;
    }

    if (db?.adapter === "in-memory" || typeof db?.query !== "function") {
      descriptionColumnSupported = true;
      return descriptionColumnSupported;
    }

    try {
      const result = await db.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = 'description'
         LIMIT 1`,
        [schema.tableName],
      );
      descriptionColumnSupported =
        (result?.rowCount ?? result?.rows?.length ?? 0) > 0;
    } catch {
      descriptionColumnSupported = false;
    }

    return descriptionColumnSupported;
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (filters.active !== undefined) {
        query.is_active = filters.active;
        delete query.active;
      }
      const includeDeleted =
        query.includeDeleted === true || query.includeDeleted === "true";
      if (query.includeDeleted !== undefined) {
        delete query.includeDeleted;
      }
      if (!(await supportsCountryColumn())) {
        delete query.country;
      }
      if (!(await supportsCountryIdsColumn())) {
        delete query.country_ids;
      }
      if (await supportsIsDeletedColumn()) {
        if (!includeDeleted && query.is_deleted === undefined) {
          query.is_deleted = false;
        }
        if (includeDeleted) {
          delete query.is_deleted;
        }
      } else {
        if (!includeDeleted && query.is_deleted !== undefined) {
          return [];
        }
        delete query.is_deleted;
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
      if (!(await supportsCountryIdsColumn())) {
        delete payload.country_ids;
      }
      if (!(await supportsDescriptionColumn())) {
        delete payload.description;
      }
      if (await supportsIsDeletedColumn()) {
        payload.is_deleted = false;
      } else {
        delete payload.is_deleted;
      }
      return db.insert(schema.tableName, payload);
    },

    async update(id, data) {
      const payload = { ...data };
      if (!(await supportsCountryColumn())) {
        delete payload.country;
      }
      if (!(await supportsCountryIdsColumn())) {
        delete payload.country_ids;
      }
      if (!(await supportsDescriptionColumn())) {
        delete payload.description;
      }
      return db.update(schema.tableName, id, payload);
    },

    async delete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      if (await supportsIsDeletedColumn()) {
        await db.update(schema.tableName, id, {
          is_deleted: true,
          display_order: -1,
        });
        return db.findById(schema.tableName, id);
      }
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async hardDelete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async restore(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      if (await supportsIsDeletedColumn()) {
        await db.update(schema.tableName, id, { is_deleted: false });
        return db.findById(schema.tableName, id);
      }
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

    async supportsCountryIds() {
      return supportsCountryIdsColumn();
    },

    async supportsIsDeleted() {
      return supportsIsDeletedColumn();
    },

    async supportsDescription() {
      return supportsDescriptionColumn();
    },
  });
}

export { createLandingRepository };
