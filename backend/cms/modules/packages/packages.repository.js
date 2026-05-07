import { randomUUID } from "node:crypto";

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

  function normalizeCountry(country) {
    return typeof country === "string" ? country.trim() : "";
  }

  async function queryMainPackages(whereClause, values, limitOne = false) {
    const orderAndLimit = limitOne ? "LIMIT 1" : "ORDER BY mp.display_order";
    const baseSelect = `SELECT mp.*,
                d.name AS destination_name,
                d.country AS destination_country
         FROM ${schema.mainPackagesTable} mp
         LEFT JOIN ${schema.destinationsTable} d ON d.id = mp.destination_id
         WHERE ${whereClause}
         ${orderAndLimit}`;

    try {
      const legacySelect = `SELECT mp.*,
                d.name AS destination_name,
                d.country AS destination_country,
                p.name AS package_name,
                p.starting_price AS starting_price
         FROM ${schema.mainPackagesTable} mp
         LEFT JOIN ${schema.destinationsTable} d ON d.id = mp.destination_id
         LEFT JOIN ${schema.packagesTable} p ON p.id = mp.package_id
         WHERE ${whereClause}
         ${orderAndLimit}`;
      return await db.query(legacySelect, values);
    } catch (error) {
      if (!isMissingColumnError(error)) {
        throw error;
      }
      return db.query(baseSelect, values);
    }
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
      clauses.push("p.main_package_id IS NOT NULL");

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push("LOWER(COALESCE(mp.country, '')) = LOWER(?)");
      }

      const whereClause = clauses.length ? clauses.join(" AND ") : "TRUE";
      try {
        const result = await db.query(
          `SELECT p.*, mp.title AS main_package_title
           FROM ${schema.packagesTable} p
           LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
           WHERE ${whereClause}
           ORDER BY p.created_at DESC`,
          values,
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        const fallbackClauses = includeDeleted ? [] : ["p.is_deleted = false"];
        const fallbackResult = await db.query(
          `SELECT p.*
           FROM ${schema.packagesTable} p
           WHERE ${fallbackClauses.length ? fallbackClauses.join(" AND ") : "TRUE"}
           ORDER BY p.created_at DESC`,
          [],
        );
        return fallbackResult.rows;
      }
    },

    async findDeletedPackages(filters = {}) {
      const values = [];
      const clauses = ["p.is_deleted = true", "p.main_package_id IS NOT NULL"];

      const country = normalizeCountry(filters.country);
      if (country) {
        values.push(country);
        clauses.push("LOWER(COALESCE(mp.country, '')) = LOWER(?)");
      }

      try {
        const result = await db.query(
          `SELECT p.*, mp.title AS main_package_title
           FROM ${schema.packagesTable} p
           LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
           WHERE ${clauses.length ? clauses.join(" AND ") : "TRUE"}
           ORDER BY p.created_at DESC`,
          values,
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        return [];
      }
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
      return runWithColumnFallback(data, (safeData) =>
        db.insert(schema.packagesTable, safeData),
      );
    },

    async updatePackageById(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.packagesTable, id, safeData),
      );
    },

    async softDeletePackageById(id) {
      return db.update(schema.packagesTable, id, {
        is_deleted: true,
        display_order: -1,
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

      const destinationId = normalizeCountry(filters.destinationId);
      if (destinationId) {
        values.push(destinationId);
        clauses.push("mp.destination_id = ?");
      }

      if (filters.is_featured !== undefined) {
        values.push(filters.is_featured);
        clauses.push("mp.is_featured = ?");
      }

      const whereClause = clauses.length ? clauses.join(" AND ") : "TRUE";
      const result = await queryMainPackages(whereClause, values);
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

      const result = await queryMainPackages(
        clauses.length ? clauses.join(" AND ") : "TRUE",
        values,
      );
      return result.rows;
    },

    async findMainPackageById(id) {
      const result = await queryMainPackages("mp.id = ?", [id], true);
      return result.rows[0] || null;
    },

    async createMainPackage(data) {
      return runWithColumnFallback(
        data,
        async (safeData) => {
          try {
            return await db.insert(schema.mainPackagesTable, safeData);
          } catch (error) {
            const message = String(error?.message || "");
            const requiresLegacyPackageId =
              /package_id/i.test(message) &&
              (/doesn't have a default value/i.test(message) ||
                /cannot be null/i.test(message));

            if (!requiresLegacyPackageId) {
              throw error;
            }

            const shadowPackageId = randomUUID();
            await db.insert(schema.packagesTable, {
              id: shadowPackageId,
              name: safeData.title || "Main Package",
              destination: safeData.country || "Unknown",
              starting_price:
                typeof safeData.amount === "number" ? safeData.amount : 0,
              package_category: "main_shadow",
              status: "DRAFT",
              is_deleted: false,
            });

            return db.insert(schema.mainPackagesTable, {
              ...safeData,
              package_id: shadowPackageId,
            });
          }
        },
        ["title", "amount", "features", "inclusions"],
      );
    },

    async updateMainPackage(id, data) {
      return runWithColumnFallback(
        data,
        (safeData) => db.update(schema.mainPackagesTable, id, safeData),
        ["title", "amount", "features", "inclusions"],
      );
    },

    async updateLegacyPackageById(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.packagesTable, id, safeData),
      );
    },

    async deleteMainPackage(id) {
      const existing = await db.findById(schema.mainPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.mainPackagesTable, id, {
        is_deleted: true,
        display_order: -1,
      });
      return db.findById(schema.mainPackagesTable, id);
    },

    async hardDeleteMainPackage(id) {
      const existing = await db.findById(schema.mainPackagesTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.mainPackagesTable} WHERE id = ?`, [
        id,
      ]);
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
      try {
        const result = await db.query(
          `SELECT p.*, mp.title AS main_package_title
           FROM ${schema.packagesTable} p
           LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
           WHERE p.main_package_id = ?
             ${includeDeleted ? "" : "AND p.is_deleted = false"}
           ORDER BY p.display_order, p.created_at DESC`,
          [mainPackageId],
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        return [];
      }
    },

    async findDeletedSubPackages(filters = {}) {
      const values = [];
      const clauses = ["p.is_deleted = true", "p.main_package_id IS NOT NULL"];
      if (filters.mainPackageId) {
        values.push(filters.mainPackageId);
        clauses.push("p.main_package_id = ?");
      }

      try {
        const result = await db.query(
          `SELECT p.*, mp.title AS main_package_title
           FROM ${schema.packagesTable} p
           LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY p.display_order, p.created_at DESC`,
          values,
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        return [];
      }
    },

    async findAllSubPackages(filters = {}) {
      const values = [];
      const clauses = ["p.main_package_id IS NOT NULL"];
      if (filters.includeDeleted !== true) {
        clauses.push("p.is_deleted = false");
      }
      if (filters.country) {
        values.push(filters.country);
        clauses.push("mp.country = ?");
      }

      try {
        const result = await db.query(
          `SELECT p.*, mp.title AS main_package_title
           FROM ${schema.packagesTable} p
           LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY p.display_order, p.created_at DESC`,
          values,
        );
        return result.rows;
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
        return [];
      }
    },

    async findSubPackageById(id) {
      const result = await db.query(
        `SELECT p.*, mp.title AS main_package_title
         FROM ${schema.packagesTable} p
         LEFT JOIN ${schema.mainPackagesTable} mp ON mp.id = p.main_package_id
         WHERE p.id = ?
         LIMIT 1`,
        [id],
      );
      return result.rows[0] || null;
    },

    async createSubPackage(data) {
      return runWithColumnFallback({ ...data, is_deleted: false }, (safeData) =>
        db.insert(schema.packagesTable, safeData),
      );
    },

    async updateSubPackage(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.packagesTable, id, safeData),
      );
    },

    async deleteSubPackage(id) {
      const existing = await db.findById(schema.packagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.packagesTable, id, {
        is_deleted: true,
        display_order: -1,
      });
      return db.findById(schema.packagesTable, id);
    },

    async hardDeleteSubPackage(id) {
      const existing = await db.findById(schema.packagesTable, id);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.packagesTable} WHERE id = ?`, [id]);
      return existing;
    },

    async restoreSubPackage(id) {
      const existing = await db.findById(schema.packagesTable, id);
      if (!existing) {
        return null;
      }
      await db.update(schema.packagesTable, id, { is_deleted: false });
      return db.findById(schema.packagesTable, id);
    },
  });
}

export { createCmsPackagesRepository };
