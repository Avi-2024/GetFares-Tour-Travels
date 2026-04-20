function createExperienceRepository({ db, schema }) {
  function isMissingColumnError(error) {
    if (!error || typeof error !== "object") {
      return false;
    }
    const message = String(error.message || "");
    return (
      error.code === "42703" ||
      error.code === "ER_BAD_FIELD_ERROR" ||
      /unknown column/i.test(message) ||
      /does not exist/i.test(message)
    );
  }

  function getMissingColumnName(error) {
    if (!isMissingColumnError(error)) {
      return null;
    }
    const message = String(error.message || "");
    const mysqlQuoteMatch = message.match(/unknown column\s+'([^']+)'/i);
    if (mysqlQuoteMatch?.[1]) {
      return mysqlQuoteMatch[1].split(".").pop();
    }
    const mysqlTickMatch = message.match(/unknown column\s+`([^`]+)`/i);
    if (mysqlTickMatch?.[1]) {
      return mysqlTickMatch[1].split(".").pop();
    }
    const pgMatch = message.match(/column\s+"([^"]+)"/i);
    if (pgMatch?.[1]) {
      return pgMatch[1];
    }
    return null;
  }

  async function runWithColumnFallback(input, runner, strictColumns = []) {
    const mutableInput = { ...input };
    const removedColumns = new Set();
    const strictSet = new Set(strictColumns);
    while (true) {
      try {
        return await runner(mutableInput);
      } catch (error) {
        const missingColumn = getMissingColumnName(error);
        if (!missingColumn) {
          throw error;
        }
        if (strictSet.has(missingColumn)) {
          throw error;
        }
        if (
          !(missingColumn in mutableInput) ||
          removedColumns.has(missingColumn)
        ) {
          throw error;
        }
        delete mutableInput[missingColumn];
        removedColumns.add(missingColumn);
      }
    }
  }

  return Object.freeze({
    async findFeaturedPicks(filters = {}) {
      const query = { ...filters };
      const includeDeleted =
        query.includeDeleted === true || query.includeDeleted === "true";
      if (query.includeDeleted !== undefined) {
        delete query.includeDeleted;
      }
      if (!includeDeleted && query.is_deleted === undefined) {
        query.is_deleted = false;
      }
      if (includeDeleted) {
        delete query.is_deleted;
      }
      return db.findMany(schema.featuredTable, query);
    },

    async findDeletedFeaturedPicks(filters = {}) {
      return db.findMany(schema.featuredTable, {
        ...filters,
        is_deleted: true,
      });
    },

    async findFeaturedPickById(id) {
      return db.findById(schema.featuredTable, id);
    },

    async createFeaturedPick(data) {
      return runWithColumnFallback(
        { ...data, is_deleted: false },
        (safeData) => db.insert(schema.featuredTable, safeData),
        ["title", "country"],
      );
    },

    async updateFeaturedPick(id, data) {
      return runWithColumnFallback(
        data,
        (safeData) => db.update(schema.featuredTable, id, safeData),
        ["title", "country"],
      );
    },

    async deleteFeaturedPick(id) {
      const existing = await db.findById(schema.featuredTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.featuredTable, id, { is_deleted: true });
      return db.findById(schema.featuredTable, id);
    },

    async hardDeleteFeaturedPick(id) {
      const existing = await db.findById(schema.featuredTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.featuredTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restoreFeaturedPick(id) {
      const existing = await db.findById(schema.featuredTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.featuredTable, id, { is_deleted: false });
      return db.findById(schema.featuredTable, id);
    },

    async deactivateFeaturedPick(id) {
      return this.deleteFeaturedPick(id);
    },

    async findSeasonCards(filters = {}) {
      const values = [];
      let whereClause = "TRUE";
      const includeDeleted =
        filters.includeDeleted === true || filters.includeDeleted === "true";

      if (filters.destinationId) {
        values.push(filters.destinationId);
        whereClause += " AND sc.destination_id = ?";
      }
      if (filters.isActive !== undefined) {
        values.push(filters.isActive);
        whereClause += " AND sc.is_active = ?";
      }
      if (filters.country) {
        values.push(filters.country);
        whereClause += " AND d.country = ?";
      }

      const result = await db.query(
        `SELECT
          sc.*,
          d.name AS destination_name,
          d.slug AS destination_slug,
          d.thumbnail_url AS destination_thumbnail_url
        FROM ${schema.seasonsTable} sc
        LEFT JOIN ${schema.destinationsTable} d
          ON d.id = sc.destination_id
        WHERE ${whereClause}
          ${includeDeleted ? "" : "AND sc.is_deleted = false"}
        ORDER BY sc.display_order ASC, sc.created_at DESC`,
        values,
      );

      return result.rows;
    },

    async findSeasonCardById(id) {
      return db.findById(schema.seasonsTable, id);
    },

    async findDeletedSeasonCards(filters = {}) {
      const values = [];
      let whereClause = "sc.is_deleted = true";

      if (filters.destinationId) {
        values.push(filters.destinationId);
        whereClause += " AND sc.destination_id = ?";
      }
      if (filters.country) {
        values.push(filters.country);
        whereClause += " AND d.country = ?";
      }

      const result = await db.query(
        `SELECT
          sc.*,
          d.name AS destination_name,
          d.slug AS destination_slug,
          d.thumbnail_url AS destination_thumbnail_url
        FROM ${schema.seasonsTable} sc
        LEFT JOIN ${schema.destinationsTable} d
          ON d.id = sc.destination_id
        WHERE ${whereClause}
        ORDER BY sc.display_order ASC, sc.created_at DESC`,
        values,
      );

      return result.rows;
    },

    async createSeasonCard(data) {
      return db.insert(schema.seasonsTable, { ...data, is_deleted: false });
    },

    async updateSeasonCard(id, data) {
      return db.update(schema.seasonsTable, id, data);
    },

    async deleteSeasonCard(id) {
      const existing = await db.findById(schema.seasonsTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.seasonsTable, id, { is_deleted: true });
      return db.findById(schema.seasonsTable, id);
    },

    async hardDeleteSeasonCard(id) {
      const existing = await db.findById(schema.seasonsTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.seasonsTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restoreSeasonCard(id) {
      const existing = await db.findById(schema.seasonsTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.seasonsTable, id, { is_deleted: false });
      return db.findById(schema.seasonsTable, id);
    },

    async findHeroSections(filters = {}) {
      return db.findMany(schema.heroTable, filters);
    },

    async upsertHeroSection(sectionKey, data) {
      await db.query(
        `INSERT INTO ${schema.heroTable} (
          country,
          section_key,
          eyebrow_text,
          heading_line_1,
          heading_line_2,
          description,
          primary_cta_label,
          primary_cta_url,
          secondary_cta_label,
          secondary_cta_url,
          background_image_url,
          is_active
        )
        VALUES (
          ?,?,?,?,?,?,?,?,?,?,?,?
        )
        ON DUPLICATE KEY UPDATE
          eyebrow_text = VALUES(eyebrow_text),
          heading_line_1 = VALUES(heading_line_1),
          heading_line_2 = VALUES(heading_line_2),
          description = VALUES(description),
          primary_cta_label = VALUES(primary_cta_label),
          primary_cta_url = VALUES(primary_cta_url),
          secondary_cta_label = VALUES(secondary_cta_label),
          secondary_cta_url = VALUES(secondary_cta_url),
          background_image_url = VALUES(background_image_url),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP`,
        [
          data.country,
          sectionKey,
          data.eyebrow_text ?? null,
          data.heading_line_1 ?? null,
          data.heading_line_2 ?? null,
          data.description ?? null,
          data.primary_cta_label ?? null,
          data.primary_cta_url ?? null,
          data.secondary_cta_label ?? null,
          data.secondary_cta_url ?? null,
          data.background_image_url ?? null,
          data.is_active ?? true,
        ],
      );

      const result = await db.query(
        `SELECT *
         FROM ${schema.heroTable}
         WHERE section_key = ?
           AND country <=> ?
         ORDER BY updated_at DESC
         LIMIT 1`,
        [sectionKey, data.country ?? null],
      );

      return result.rows[0] || null;
    },
  });
}

export { createExperienceRepository };
