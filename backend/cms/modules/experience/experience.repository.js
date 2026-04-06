function createExperienceRepository({ db, schema }) {
  return Object.freeze({
    async findFeaturedPicks(filters = {}) {
      return db.findMany(schema.featuredTable, filters);
    },

    async findFeaturedPickById(id) {
      return db.findById(schema.featuredTable, id);
    },

    async createFeaturedPick(data) {
      return db.insert(schema.featuredTable, data);
    },

    async updateFeaturedPick(id, data) {
      return db.update(schema.featuredTable, id, data);
    },

    async deactivateFeaturedPick(id) {
      return db.update(schema.featuredTable, id, { is_active: false });
    },

    async findSeasonCards(filters = {}) {
      const values = [];
      let whereClause = "TRUE";

      if (filters.destinationId) {
        values.push(filters.destinationId);
        whereClause += ` AND sc.destination_id = $${values.length}`;
      }
      if (filters.isActive !== undefined) {
        values.push(filters.isActive);
        whereClause += ` AND sc.is_active = $${values.length}`;
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

    async findSeasonCardById(id) {
      return db.findById(schema.seasonsTable, id);
    },

    async createSeasonCard(data) {
      return db.insert(schema.seasonsTable, data);
    },

    async updateSeasonCard(id, data) {
      return db.update(schema.seasonsTable, id, data);
    },

    async deleteSeasonCard(id) {
      const result = await db.query(
        `DELETE FROM ${schema.seasonsTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },

    async findHeroSections() {
      return db.findMany(schema.heroTable, {});
    },

    async upsertHeroSection(sectionKey, data) {
      const result = await db.query(
        `INSERT INTO ${schema.heroTable} (
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
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        ON CONFLICT (section_key)
        DO UPDATE SET
          eyebrow_text = EXCLUDED.eyebrow_text,
          heading_line_1 = EXCLUDED.heading_line_1,
          heading_line_2 = EXCLUDED.heading_line_2,
          description = EXCLUDED.description,
          primary_cta_label = EXCLUDED.primary_cta_label,
          primary_cta_url = EXCLUDED.primary_cta_url,
          secondary_cta_label = EXCLUDED.secondary_cta_label,
          secondary_cta_url = EXCLUDED.secondary_cta_url,
          background_image_url = EXCLUDED.background_image_url,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *`,
        [
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

      return result.rows[0] || null;
    },
  });
}

export { createExperienceRepository };
