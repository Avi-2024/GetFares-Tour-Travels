function createCmsPackagesRepository({ db, schema }) {
  function normalizeCountry(country) {
    return typeof country === "string" ? country.trim() : "";
  }

  return Object.freeze({
    async findPublishedPackages(filters = {}) {
      const values = [];
      const clauses = [
        "p.publish_to_website = true",
        "p.is_deleted = false",
      ];

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push(
          `EXISTS (
            SELECT 1
            FROM ${schema.mainPackagesTable} mp
            WHERE mp.package_id = p.id
              AND LOWER(mp.country) = LOWER($${values.length})
          )`,
        );
      }

      const result = await db.query(
        `SELECT p.*
         FROM ${schema.packagesTable} p
         WHERE ${clauses.join(" AND ")}
         ORDER BY p.created_at DESC`,
        values,
      );
      return result.rows;
    },

    async findPackageById(id) {
      return db.findById(schema.packagesTable, id);
    },

    async updatePackageById(id, data) {
      return db.update(schema.packagesTable, id, data);
    },

    async findAllMainPackages(filters = {}) {
      const values = [];
      const clauses = ["p.is_deleted = false"];

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push(`LOWER(mp.country) = LOWER($${values.length})`);
      }

      if (filters.is_featured !== undefined) {
        values.push(filters.is_featured);
        clauses.push(`mp.is_featured = $${values.length}`);
      }

      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         WHERE ${clauses.join(" AND ")}
         ORDER BY mp.display_order`,
        values,
      );
      return result.rows;
    },

    async findMainPackageById(id) {
      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         WHERE mp.id = $1
         LIMIT 1`,
        [id],
      );
      return result.rows[0] || null;
    },

    async createMainPackage(data) {
      return db.insert(schema.mainPackagesTable, data);
    },

    async updateMainPackage(id, data) {
      return db.update(schema.mainPackagesTable, id, data);
    },

    async deleteMainPackage(id) {
      const result = await db.query(
        `DELETE FROM ${schema.mainPackagesTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },

    async findSubPackages(mainPackageId) {
      const result = await db.query(
        `SELECT sp.*, p.name, p.starting_price, p.duration, p.banner_image_url
         FROM ${schema.subPackagesTable} sp
         JOIN ${schema.packagesTable} p ON sp.package_id = p.id
         WHERE sp.main_package_id = $1
           AND p.is_deleted = false
           AND p.publish_to_website = true
         ORDER BY sp.display_order`,
        [mainPackageId],
      );
      return result.rows;
    },

    async findSubPackageById(id) {
      return db.findById(schema.subPackagesTable, id);
    },

    async createSubPackage(data) {
      return db.insert(schema.subPackagesTable, data);
    },

    async updateSubPackage(id, data) {
      return db.update(schema.subPackagesTable, id, data);
    },

    async deleteSubPackage(id) {
      const result = await db.query(
        `DELETE FROM ${schema.subPackagesTable} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] || null;
    },
  });
}

export { createCmsPackagesRepository };
