function createCmsPackagesRepository({ db, schema }) {
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

    async findDestinationById(id) {
      if (!id) return null;
      return db.findById(schema.destinationsTable, id);
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
        clauses.push("mp.is_deleted = false");
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
        `SELECT mp.*,
                d.name AS destination_name,
                d.country AS destination_country,
                p.name AS legacy_package_name,
                p.destination AS legacy_destination
         FROM ${schema.mainPackagesTable} mp
         LEFT JOIN ${schema.destinationsTable} d ON d.id = mp.destination_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = mp.package_id
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
        `SELECT mp.*,
                d.name AS destination_name,
                d.country AS destination_country,
                p.name AS legacy_package_name,
                p.destination AS legacy_destination
         FROM ${schema.mainPackagesTable} mp
         LEFT JOIN ${schema.destinationsTable} d ON d.id = mp.destination_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = mp.package_id
         WHERE ${clauses.length ? clauses.join(" AND ") : "TRUE"}
         ORDER BY mp.display_order`,
        values,
      );
      return result.rows;
    },

    async findMainPackageById(id) {
      const result = await db.query(
        `SELECT mp.*,
                d.name AS destination_name,
                d.country AS destination_country,
                p.name AS legacy_package_name,
                p.destination AS legacy_destination
         FROM ${schema.mainPackagesTable} mp
         LEFT JOIN ${schema.destinationsTable} d ON d.id = mp.destination_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = mp.package_id
         WHERE mp.id = ?
         LIMIT 1`,
        [id],
      );
      return result.rows[0] || null;
    },

    async createMainPackage(data) {
      return runWithColumnFallback(data, (safeData) =>
        db.insert(schema.mainPackagesTable, safeData),
      );
    },

    async updateMainPackage(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.mainPackagesTable, id, safeData),
      );
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
        `SELECT sp.*,
                COALESCE(p.name, mp.package_id) AS main_package_title,
                p.name AS legacy_package_name
         FROM ${schema.subPackagesTable} sp
         LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = sp.main_package_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = sp.package_id
         WHERE sp.main_package_id = ?
           ${includeDeleted ? "" : "AND sp.is_deleted = false"}
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
        `SELECT sp.*,
                COALESCE(p.name, mp.package_id) AS main_package_title,
                p.name AS legacy_package_name
         FROM ${schema.subPackagesTable} sp
         LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = sp.main_package_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = sp.package_id
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
      return runWithColumnFallback(
        { ...data, is_deleted: false },
        (safeData) => db.insert(schema.subPackagesTable, safeData),
      );
    },

    async updateSubPackage(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.subPackagesTable, id, safeData),
      );
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
