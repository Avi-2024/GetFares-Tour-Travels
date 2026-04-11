function isMissingColumnError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = String(error.message || "");
  return (
    error.code === "42703" ||
    error.code === "ER_BAD_FIELD_ERROR" ||
    /column\s+"[^"]+"\s+.*does not exist/i.test(message) ||
    /unknown column\s+`[^`]+`/i.test(message) ||
    /unknown column\s+'[^']+'/i.test(message)
  );
}

function getMissingColumnName(error) {
  if (!isMissingColumnError(error)) {
    return null;
  }

  const message = String(error.message || "");
  const pgRelationMatch = message.match(
    /column\s+"([^"]+)"\s+of relation\s+"[^"]+"\s+does not exist/i,
  );
  if (pgRelationMatch?.[1]) {
    return pgRelationMatch[1];
  }

  const pgGenericMatch = message.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (pgGenericMatch?.[1]) {
    return pgGenericMatch[1];
  }

  const mysqlTickMatch = message.match(/unknown column\s+`([^`]+)`/i);
  if (mysqlTickMatch?.[1]) {
    return mysqlTickMatch[1].split(".").pop();
  }

  const mysqlQuoteMatch = message.match(/unknown column\s+'([^']+)'/i);
  if (mysqlQuoteMatch?.[1]) {
    return mysqlQuoteMatch[1].split(".").pop();
  }

  return null;
}

async function runWithColumnFallback(input, runner) {
  const mutableInput = { ...input };
  const removedColumns = new Set();

  while (true) {
    try {
      return await runner(mutableInput);
    } catch (error) {
      const missingColumn = getMissingColumnName(error);
      if (!missingColumn) {
        throw error;
      }
      if (!(missingColumn in mutableInput) || removedColumns.has(missingColumn)) {
        throw error;
      }
      delete mutableInput[missingColumn];
      removedColumns.add(missingColumn);
    }
  }
}

function createDestinationsRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (query.is_deleted === undefined) {
        query.is_deleted = false;
      }
      try {
        return await db.findMany(schema.tableName, query);
      } catch (error) {
        const missingColumn = getMissingColumnName(error);
        if (!missingColumn) {
          throw error;
        }
        if (missingColumn === "is_deleted" && filters.is_deleted !== undefined) {
          return [];
        }
        return runWithColumnFallback(query, (safeQuery) =>
          db.findMany(schema.tableName, safeQuery),
        );
      }
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async findBySlug(slug) {
      return db.findOne(schema.tableName, { slug });
    },

    async create(data) {
      return runWithColumnFallback({ ...data, is_deleted: false }, (safeData) =>
        db.insert(schema.tableName, safeData),
      );
    },

    async update(id, data) {
      return db.update(schema.tableName, id, data);
    },

    async delete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      try {
        await db.update(schema.tableName, id, { is_deleted: true });
        return db.findById(schema.tableName, id);
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
        return existing;
      }
    },

    async hardDelete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async findMedia(destinationId, filters = {}) {
      return runWithColumnFallback({
        destination_id: destinationId,
        is_deleted: false,
        ...filters,
      }, (safeFilters) => db.findMany(schema.mediaTable, safeFilters));
    },

    async findMediaById(mediaId) {
      return db.findById(schema.mediaTable, mediaId);
    },

    async createMedia(data) {
      return runWithColumnFallback({ ...data, is_deleted: false }, (safeData) =>
        db.insert(schema.mediaTable, safeData),
      );
    },

    async updateMedia(mediaId, data) {
      return db.update(schema.mediaTable, mediaId, data);
    },

    async deleteMedia(mediaId) {
      const existing = await db.findById(schema.mediaTable, mediaId);
      if (!existing) {
        return null;
      }
      try {
        await db.update(schema.mediaTable, mediaId, { is_deleted: true });
        return db.findById(schema.mediaTable, mediaId);
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        await db.query(`DELETE FROM ${schema.mediaTable} WHERE id = ?`, [mediaId]);
        return existing;
      }
    },

    async hardDeleteMedia(mediaId) {
      const existing = await db.findById(schema.mediaTable, mediaId);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.mediaTable} WHERE id = ?`, [mediaId]);
      return existing;
    },

    async findSeasons(destinationId) {
      return runWithColumnFallback({
        destination_id: destinationId,
        is_deleted: false,
      }, (safeFilters) => db.findMany(schema.seasonsTable, safeFilters));
    },

    async findSeasonById(seasonId) {
      return db.findById(schema.seasonsTable, seasonId);
    },

    async createSeason(data) {
      return runWithColumnFallback({ ...data, is_deleted: false }, (safeData) =>
        db.insert(schema.seasonsTable, safeData),
      );
    },

    async updateSeason(seasonId, data) {
      return db.update(schema.seasonsTable, seasonId, data);
    },

    async deleteSeason(seasonId) {
      const existing = await db.findById(schema.seasonsTable, seasonId);
      if (!existing) {
        return null;
      }
      try {
        await db.update(schema.seasonsTable, seasonId, { is_deleted: true });
        return db.findById(schema.seasonsTable, seasonId);
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        await db.query(`DELETE FROM ${schema.seasonsTable} WHERE id = ?`, [seasonId]);
        return existing;
      }
    },

    async hardDeleteSeason(seasonId) {
      const existing = await db.findById(schema.seasonsTable, seasonId);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.seasonsTable} WHERE id = ?`, [seasonId]);
      return existing;
    },

    async findPackageMaps(destinationId) {
      try {
        const result = await db.query(
          `SELECT dpm.*, mp.display_order as package_display_order, mp.is_featured,
                  p.name, p.starting_price, p.duration, p.banner_image_url
           FROM ${schema.packagesMapTable} dpm
           JOIN ${schema.tableName} d ON dpm.destination_id = d.id
           JOIN main_packages mp ON dpm.main_package_id = mp.id
           JOIN packages p ON mp.package_id = p.id
           WHERE dpm.destination_id = ?
             AND p.publish_to_website = true
             AND p.is_deleted = false
             AND dpm.is_deleted = false
             AND (mp.country IS NULL OR d.country IS NULL OR LOWER(mp.country) = LOWER(d.country))
           ORDER BY dpm.display_order`,
          [destinationId],
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        const result = await db.query(
          `SELECT dpm.*, mp.display_order as package_display_order, mp.is_featured,
                  p.name, p.starting_price, p.duration, p.banner_image_url
           FROM ${schema.packagesMapTable} dpm
           JOIN main_packages mp ON dpm.main_package_id = mp.id
           JOIN packages p ON mp.package_id = p.id
           WHERE dpm.destination_id = ?
             AND p.publish_to_website = true
           ORDER BY dpm.display_order`,
          [destinationId],
        );
        return result.rows;
      }
    },

    async createPackageMap(data) {
      return runWithColumnFallback({ ...data, is_deleted: false }, (safeData) =>
        db.insert(schema.packagesMapTable, safeData),
      );
    },

    async findMainPackageById(id) {
      return db.findById("main_packages", id);
    },

    async deletePackageMap(id) {
      const existing = await db.findById(schema.packagesMapTable, id);
      if (!existing) {
        return null;
      }
      try {
        await db.update(schema.packagesMapTable, id, { is_deleted: true });
        return db.findById(schema.packagesMapTable, id);
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        await db.query(`DELETE FROM ${schema.packagesMapTable} WHERE id = ?`, [id]);
        return existing;
      }
    },

    async hardDeletePackageMap(id) {
      const existing = await db.findById(schema.packagesMapTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.packagesMapTable} WHERE id = ?`, [id]);
      return existing;
    },
  });
}

export { createDestinationsRepository };
