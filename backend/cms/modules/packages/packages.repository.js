function createCmsPackagesRepository({ db, schema }) {
  function normalizeCountry(country) {
    return typeof country === "string" ? country.trim() : "";
  }

  return Object.freeze({
    async findPublishedPackages(filters = {}) {
      const values = [];
      const clauses = [];
      const includeDeleted =
        filters.includeDeleted === true || filters.includeDeleted === "true";
      if (!includeDeleted) {
        clauses.push("p.is_deleted = false");
      }

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push(
          `EXISTS (
            SELECT 1
            FROM ${schema.mainPackagesTable} mp
            WHERE mp.package_id = p.id
              AND LOWER(mp.country) = LOWER(?)
          )`,
        );
      }

      const whereClause = clauses.length ? clauses.join(" AND ") : "TRUE";
      const result = await db.query(
        `SELECT p.*
         FROM ${schema.packagesTable} p
         WHERE ${whereClause}
         ORDER BY p.created_at DESC`,
        values,
      );
      return result.rows;
    },

    async findDeletedPackages(filters = {}) {
      const values = [];
      const clauses = ["p.is_deleted = true"];

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push(
          `EXISTS (
            SELECT 1
            FROM ${schema.mainPackagesTable} mp
            WHERE mp.package_id = p.id
              AND LOWER(mp.country) = LOWER(?)
          )`,
        );
      }

      const result = await db.query(
        `SELECT p.*
         FROM ${schema.packagesTable} p
         WHERE ${clauses.length ? clauses.join(" AND ") : "TRUE"}
         ORDER BY p.created_at DESC`,
        values,
      );
      return result.rows;
    },

    async findPackageById(id) {
      return db.findById(schema.packagesTable, id);
    },

    async findPackageByWebsiteSlug(websiteSlug) {
      return db.findOne(schema.packagesTable, {
        website_slug: websiteSlug,
        is_deleted: false,
      });
    },

    async createPackage(data) {
      return db.insert(schema.packagesTable, data);
    },

    async updatePackageById(id, data) {
      return db.update(schema.packagesTable, id, data);
    },

    async softDeletePackageById(id) {
      return db.update(schema.packagesTable, id, {
        is_deleted: true,
        publish_to_website: false,
      });
    },

    async hardDeletePackageById(id) {
      const existing = await db.findById(schema.packagesTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.packagesTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restorePackageById(id) {
      const existing = await db.findById(schema.packagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.packagesTable, id, { is_deleted: false });
      return db.findById(schema.packagesTable, id);
    },

    async findAllMainPackages(filters = {}) {
      const values = [];
      const clauses = [];
      const includeDeleted =
        filters.includeDeleted === true || filters.includeDeleted === "true";
      if (!includeDeleted) {
        clauses.push("p.is_deleted = false", "mp.is_deleted = false");
      }

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push("LOWER(mp.country) = LOWER(?)");
      }

      if (filters.is_featured !== undefined) {
        values.push(filters.is_featured);
        clauses.push("mp.is_featured = ?");
      }

      const whereClause = clauses.length ? clauses.join(" AND ") : "TRUE";
      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website,
                d.name AS destination_name
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         LEFT JOIN ${schema.destinationsTable} d ON mp.destination_id = d.id
         WHERE ${whereClause}
         ORDER BY mp.display_order`,
        values,
      );
      return result.rows;
    },

    async findDeletedMainPackages(filters = {}) {
      const values = [];
      const clauses = ["mp.is_deleted = true"];

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push("LOWER(mp.country) = LOWER(?)");
      }

      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website,
                d.name AS destination_name
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         LEFT JOIN ${schema.destinationsTable} d ON mp.destination_id = d.id
         WHERE ${clauses.length ? clauses.join(" AND ") : "TRUE"}
         ORDER BY mp.display_order`,
        values,
      );
      return result.rows;
    },

    async findMainPackageById(id) {
      const result = await db.query(
        `SELECT mp.*, p.name, p.destination, p.starting_price, p.duration,
                p.banner_image_url, p.publish_to_website,
                d.name AS destination_name
         FROM ${schema.mainPackagesTable} mp
         JOIN ${schema.packagesTable} p ON mp.package_id = p.id
         LEFT JOIN ${schema.destinationsTable} d ON mp.destination_id = d.id
         WHERE mp.id = ?
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
      const existing = await db.findById(schema.mainPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.mainPackagesTable, id, { is_deleted: true });
      return db.findById(schema.mainPackagesTable, id);
    },

    async hardDeleteMainPackage(id) {
      const existing = await db.findById(schema.mainPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.mainPackagesTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restoreMainPackage(id) {
      const existing = await db.findById(schema.mainPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.mainPackagesTable, id, { is_deleted: false });
      return db.findById(schema.mainPackagesTable, id);
    },

    async findSubPackages(mainPackageId, includeDeleted = false) {
      const result = await db.query(
        `SELECT sp.*, p.name, p.starting_price, p.duration, p.banner_image_url
         FROM ${schema.subPackagesTable} sp
         JOIN ${schema.packagesTable} p ON sp.package_id = p.id
         WHERE sp.main_package_id = ?
           ${includeDeleted ? "" : "AND sp.is_deleted = false"}
           ${includeDeleted ? "" : "AND p.is_deleted = false"}
           ${includeDeleted ? "" : "AND p.publish_to_website = true"}
         ORDER BY sp.display_order`,
        [mainPackageId],
      );
      return result.rows;
    },

    async findDeletedSubPackages(filters = {}) {
      const values = [];
      const clauses = ["sp.is_deleted = true"];
      if (filters.mainPackageId) {
        values.push(filters.mainPackageId);
        clauses.push("sp.main_package_id = ?");
      }

      const result = await db.query(
        `SELECT sp.*, p.name, p.starting_price, p.duration, p.banner_image_url
         FROM ${schema.subPackagesTable} sp
         JOIN ${schema.packagesTable} p ON sp.package_id = p.id
         WHERE ${clauses.join(" AND ")}
         ORDER BY sp.display_order`,
        values,
      );
      return result.rows;
    },

    async findSubPackageById(id) {
      return db.findById(schema.subPackagesTable, id);
    },

    async createSubPackage(data) {
      return db.insert(schema.subPackagesTable, { ...data, is_deleted: false });
    },

    async updateSubPackage(id, data) {
      return db.update(schema.subPackagesTable, id, data);
    },

    async deleteSubPackage(id) {
      const existing = await db.findById(schema.subPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.subPackagesTable, id, { is_deleted: true });
      return db.findById(schema.subPackagesTable, id);
    },

    async hardDeleteSubPackage(id) {
      const existing = await db.findById(schema.subPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.subPackagesTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restoreSubPackage(id) {
      const existing = await db.findById(schema.subPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.subPackagesTable, id, { is_deleted: false });
      return db.findById(schema.subPackagesTable, id);
    },
  });
}

export { createCmsPackagesRepository };
