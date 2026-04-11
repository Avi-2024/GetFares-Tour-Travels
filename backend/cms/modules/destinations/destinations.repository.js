function createDestinationsRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      const query = { ...filters };
      if (query.is_deleted === undefined) {
        query.is_deleted = false;
      }
      return db.findMany(schema.tableName, query);
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async findBySlug(slug) {
      return db.findOne(schema.tableName, { slug });
    },

    async create(data) {
      return db.insert(schema.tableName, { ...data, is_deleted: false });
    },

    async update(id, data) {
      return db.update(schema.tableName, id, data);
    },

    async delete(id) {
      const existing = await db.findById(schema.tableName, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.tableName, id, { is_deleted: true });
      return db.findById(schema.tableName, id);
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
      return db.findMany(schema.mediaTable, {
        destination_id: destinationId,
        is_deleted: false,
        ...filters,
      });
    },

    async findMediaById(mediaId) {
      return db.findById(schema.mediaTable, mediaId);
    },

    async createMedia(data) {
      return db.insert(schema.mediaTable, { ...data, is_deleted: false });
    },

    async updateMedia(mediaId, data) {
      return db.update(schema.mediaTable, mediaId, data);
    },

    async deleteMedia(mediaId) {
      const existing = await db.findById(schema.mediaTable, mediaId);
      if (!existing) {
        return null;
      }
      await db.update(schema.mediaTable, mediaId, { is_deleted: true });
      return db.findById(schema.mediaTable, mediaId);
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
      return db.findMany(schema.seasonsTable, {
        destination_id: destinationId,
        is_deleted: false,
      });
    },

    async findSeasonById(seasonId) {
      return db.findById(schema.seasonsTable, seasonId);
    },

    async createSeason(data) {
      return db.insert(schema.seasonsTable, { ...data, is_deleted: false });
    },

    async updateSeason(seasonId, data) {
      return db.update(schema.seasonsTable, seasonId, data);
    },

    async deleteSeason(seasonId) {
      const existing = await db.findById(schema.seasonsTable, seasonId);
      if (!existing) {
        return null;
      }
      await db.update(schema.seasonsTable, seasonId, { is_deleted: true });
      return db.findById(schema.seasonsTable, seasonId);
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
    },

    async createPackageMap(data) {
      return db.insert(schema.packagesMapTable, { ...data, is_deleted: false });
    },

    async findMainPackageById(id) {
      return db.findById("main_packages", id);
    },

    async deletePackageMap(id) {
      const existing = await db.findById(schema.packagesMapTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.packagesMapTable, id, { is_deleted: true });
      return db.findById(schema.packagesMapTable, id);
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
