function createDestinationsRepository({ db, schema }) {
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

    async findMedia(destinationId, filters = {}) {
      return db.findMany(schema.mediaTable, {
        destination_id: destinationId,
        ...filters,
      });
    },

    async findMediaById(mediaId) {
      return db.findById(schema.mediaTable, mediaId);
    },

    async createMedia(data) {
      return db.insert(schema.mediaTable, data);
    },

    async updateMedia(mediaId, data) {
      return db.update(schema.mediaTable, mediaId, data);
    },

    async deleteMedia(mediaId) {
      const result = await db.query(
        `DELETE FROM ${schema.mediaTable} WHERE id = $1 RETURNING *`,
        [mediaId],
      );
      return result.rows[0] || null;
    },

    async findSeasons(destinationId) {
      return db.findMany(schema.seasonsTable, {
        destination_id: destinationId,
      });
    },

    async findSeasonById(seasonId) {
      return db.findById(schema.seasonsTable, seasonId);
    },

    async createSeason(data) {
      return db.insert(schema.seasonsTable, data);
    },

    async updateSeason(seasonId, data) {
      return db.update(schema.seasonsTable, seasonId, data);
    },

    async deleteSeason(seasonId) {
      const result = await db.query(
        `DELETE FROM ${schema.seasonsTable} WHERE id = $1 RETURNING *`,
        [seasonId],
      );
      return result.rows[0] || null;
    },

    async findPackageMaps(destinationId) {
      const result = await db.query(
        `SELECT dpm.*, mp.display_order as package_display_order, mp.is_featured,
                p.name, p.starting_price, p.duration, p.banner_image_url
         FROM ${schema.packagesMapTable} dpm
         JOIN ${schema.tableName} d ON dpm.destination_id = d.id
         JOIN main_packages mp ON dpm.main_package_id = mp.id
         JOIN packages p ON mp.package_id = p.id
         WHERE dpm.destination_id = $1
           AND p.publish_to_website = true
           AND p.is_deleted = false
           AND (mp.country IS NULL OR d.country IS NULL OR LOWER(mp.country) = LOWER(d.country))
         ORDER BY dpm.display_order`,
        [destinationId],
      );
      return result.rows;
    },

    async createPackageMap(data) {
      return db.insert(schema.packagesMapTable, data);
    },

    async findMainPackageById(id) {
      return db.findById("main_packages", id);
    },

    async deletePackageMap(id) {
      const result = await db.query(
        `DELETE FROM ${schema.packagesMapTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },
  });
}

export { createDestinationsRepository };
