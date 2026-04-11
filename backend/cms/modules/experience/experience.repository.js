function createExperienceRepository({ db, schema }) {
  return Object.freeze({
    async findFeaturedPicks(filters = {}) {
      const query = { ...filters };
      if (query.is_deleted === undefined) {
        query.is_deleted = false;
      }
      return db.findMany(schema.featuredTable, query);
    },

    async findDeletedFeaturedPicks(filters = {}) {
      return db.findMany(schema.featuredTable, { ...filters, is_deleted: true });
    },

    async findFeaturedPickById(id) {
      return db.findById(schema.featuredTable, id);
    },

    async createFeaturedPick(data) {
      return db.insert(schema.featuredTable, { ...data, is_deleted: false });
    },

    async updateFeaturedPick(id, data) {
      return db.update(schema.featuredTable, id, data);
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

    async deactivateFeaturedPick(id) {
      return this.deleteFeaturedPick(id);
    },

    async findSeasonCards(filters = {}) {
      const values = [];
      let whereClause = "TRUE";

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
          AND sc.is_deleted = false
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
