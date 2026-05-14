function createPackagesRepository({ db, logger, schema }) {
  const PACKAGE_JSON_COLUMNS = new Set([
    "custom_services",
    "itinerary",
    "gallery_image_urls",
    "features",
    "highlights",
  ]);
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 15;
  const MAX_LIMIT = 50;

  function canUseRawQuery() {
    return typeof db.query === "function" && db.adapter === "mysql";
  }

  function toPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  function normalizePagination(filters = {}) {
    const page = toPositiveInt(filters.page, DEFAULT_PAGE);
    const requestedLimit = toPositiveInt(filters.limit, DEFAULT_LIMIT);
    const limit = Math.min(MAX_LIMIT, requestedLimit);
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  function escapeLike(value) {
    return String(value).replace(/[\\%_]/g, "\\$&");
  }

  function normalizeSearchValue(value) {
    return String(value || "").trim();
  }

  function buildWhere(filters = {}) {
    const where = ["COALESCE(p.is_deleted, 0) = 0"];
    const params = [];

    if (filters.status) {
      where.push("p.status = ?");
      params.push(filters.status);
    }
    if (filters.packageCategory) {
      where.push("p.package_category = ?");
      params.push(filters.packageCategory);
    }
    if (typeof filters.publishToWebsite === "boolean") {
      where.push("COALESCE(p.publish_to_website, 0) = ?");
      params.push(filters.publishToWebsite ? 1 : 0);
    }
    if (typeof filters.isSoldOut === "boolean") {
      where.push("COALESCE(p.is_sold_out, 0) = ?");
      params.push(filters.isSoldOut ? 1 : 0);
    }
    if (filters.createdFrom) {
      where.push("DATE(p.created_at) >= ?");
      params.push(filters.createdFrom);
    }
    if (filters.createdTo) {
      where.push("DATE(p.created_at) <= ?");
      params.push(filters.createdTo);
    }

    const destination = normalizeSearchValue(filters.destination);
    if (destination) {
      where.push("LOWER(COALESCE(p.destination, '')) LIKE ?");
      params.push(`%${escapeLike(destination.toLowerCase())}%`);
    }

    const search = normalizeSearchValue(filters.search);
    if (search) {
      const wildcard = `%${escapeLike(search.toLowerCase())}%`;
      where.push(`(
        LOWER(COALESCE(p.id, '')) LIKE ?
        OR LOWER(COALESCE(p.name, '')) LIKE ?
        OR LOWER(COALESCE(p.destination, '')) LIKE ?
        OR LOWER(COALESCE(p.status, '')) LIKE ?
        OR LOWER(COALESCE(p.package_category, '')) LIKE ?
        OR LOWER(COALESCE(p.website_slug, '')) LIKE ?
      )`);
      params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
    }

    return {
      whereSql: where.join(" AND "),
      params,
    };
  }

  function buildSortSql(filters = {}) {
    const sortBy = String(filters.sortBy || "createdAt").trim();
    const sortOrder =
      String(filters.sortOrder || "desc").trim().toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    let sortExpression = "COALESCE(p.created_at, '1970-01-01 00:00:00')";
    if (sortBy === "name") {
      sortExpression = "LOWER(COALESCE(p.name, ''))";
    } else if (sortBy === "destination") {
      sortExpression = "LOWER(COALESCE(p.destination, ''))";
    } else if (sortBy === "status") {
      sortExpression = "LOWER(COALESCE(p.status, ''))";
    } else if (sortBy === "startingPrice") {
      sortExpression = "COALESCE(p.starting_price, 0)";
    } else if (sortBy === "updatedAt") {
      sortExpression = "COALESCE(p.updated_at, '1970-01-01 00:00:00')";
    } else if (sortBy === "validTo") {
      sortExpression = "COALESCE(p.valid_to, '9999-12-31')";
    }

    return `${sortExpression} ${sortOrder}, p.id DESC`;
  }

  function sortInMemory(rows = [], filters = {}) {
    const sortBy = String(filters.sortBy || "createdAt").trim();
    const factor =
      String(filters.sortOrder || "desc").trim().toLowerCase() === "asc"
        ? 1
        : -1;

    return rows.slice().sort((left, right) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = String(left.name || "").localeCompare(String(right.name || ""));
      } else if (sortBy === "destination") {
        comparison = String(left.destination || "").localeCompare(
          String(right.destination || ""),
        );
      } else if (sortBy === "status") {
        comparison = String(left.status || "").localeCompare(
          String(right.status || ""),
        );
      } else if (sortBy === "startingPrice") {
        comparison =
          Number(left.starting_price ?? left.startingPrice ?? 0) -
          Number(right.starting_price ?? right.startingPrice ?? 0);
      } else if (sortBy === "updatedAt") {
        comparison =
          new Date(left.updated_at || left.updatedAt || 0).getTime() -
          new Date(right.updated_at || right.updatedAt || 0).getTime();
      } else if (sortBy === "validTo") {
        comparison =
          new Date(left.valid_to || left.validTo || 0).getTime() -
          new Date(right.valid_to || right.validTo || 0).getTime();
      } else {
        comparison =
          new Date(left.created_at || left.createdAt || 0).getTime() -
          new Date(right.created_at || right.createdAt || 0).getTime();
      }
      if (comparison === 0) {
        comparison = String(right.id || "").localeCompare(String(left.id || ""));
      }
      return comparison * factor;
    });
  }

  function toDatabaseJsonValue(value) {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return value;
      } catch (_error) {
        return JSON.stringify(value);
      }
    }
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return JSON.stringify(null);
    }
  }

  function serializeJsonColumns(payload = {}) {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const result = { ...payload };
    PACKAGE_JSON_COLUMNS.forEach((column) => {
      if (Object.prototype.hasOwnProperty.call(result, column)) {
        result[column] = toDatabaseJsonValue(result[column]);
      }
    });
    return result;
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const pagination = normalizePagination(filters);

      if (canUseRawQuery()) {
        const where = buildWhere(filters);
        const countResult = await db.query(
          `
            SELECT COUNT(*) AS total_count
            FROM ${schema.tableName} p
            WHERE ${where.whereSql}
          `,
          where.params,
        );
        const totalItems = Number(countResult.rows?.[0]?.total_count || 0);
        const rowsResult = await db.query(
          `
            SELECT p.*
            FROM ${schema.tableName} p
            WHERE ${where.whereSql}
            ORDER BY ${buildSortSql(filters)}
            LIMIT ?
            OFFSET ?
          `,
          [...where.params, pagination.limit, pagination.offset],
        );

        return {
          items: Array.isArray(rowsResult.rows) ? rowsResult.rows : [],
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / pagination.limit)),
          },
        };
      }

      const mapped = {};
      if (filters.status) mapped.status = filters.status;
      if (filters.packageCategory) mapped.package_category = filters.packageCategory;
      if (typeof filters.publishToWebsite === "boolean") {
        mapped.publish_to_website = filters.publishToWebsite;
      }
      if (typeof filters.isSoldOut === "boolean") {
        mapped.is_sold_out = filters.isSoldOut;
      }
      const rows = await db.findMany(schema.tableName, mapped);
      const search = normalizeSearchValue(filters.search).toLowerCase();
      const destination = normalizeSearchValue(filters.destination).toLowerCase();
      const filtered = (Array.isArray(rows) ? rows : []).filter((row) => {
        if (row.is_deleted === true || row.isDeleted === true) {
          return false;
        }
        const createdAt = String(row.created_at || row.createdAt || "").slice(0, 10);
        if (filters.createdFrom && createdAt && createdAt < filters.createdFrom) {
          return false;
        }
        if (filters.createdTo && createdAt && createdAt > filters.createdTo) {
          return false;
        }
        if (
          destination &&
          !String(row.destination || "").toLowerCase().includes(destination)
        ) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = [
          row.id,
          row.name,
          row.destination,
          row.status,
          row.package_category,
          row.website_slug,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
      const sorted = sortInMemory(filtered, filters);
      const paginated = sorted.slice(
        pagination.offset,
        pagination.offset + pagination.limit,
      );

      return {
        items: paginated,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalItems: sorted.length,
          totalPages: Math.max(1, Math.ceil(sorted.length / pagination.limit)),
        },
      };
    },

    async summarizeList(filters = {}) {
      if (canUseRawQuery()) {
        const where = buildWhere(filters);
        const result = await db.query(
          `
            SELECT
              COUNT(*) AS total_packages,
              SUM(CASE WHEN COALESCE(p.publish_to_website, 0) = 1 THEN 1 ELSE 0 END) AS published_count,
              SUM(CASE WHEN COALESCE(p.status, '') = 'ACTIVE' THEN 1 ELSE 0 END) AS active_count,
              SUM(CASE WHEN COALESCE(p.is_sold_out, 0) = 1 THEN 1 ELSE 0 END) AS sold_out_count,
              COUNT(DISTINCT NULLIF(TRIM(COALESCE(p.destination, '')), '')) AS destination_count,
              COALESCE(SUM(COALESCE(p.starting_price, 0)), 0) AS total_value
            FROM ${schema.tableName} p
            WHERE ${where.whereSql}
          `,
          where.params,
        );
        const row = result.rows?.[0] || {};
        return {
          totalPackages: Number(row.total_packages || 0),
          publishedCount: Number(row.published_count || 0),
          activeCount: Number(row.active_count || 0),
          soldOutCount: Number(row.sold_out_count || 0),
          destinationCount: Number(row.destination_count || 0),
          totalValue: Number(row.total_value || 0),
        };
      }

      const rows = await db.findMany(schema.tableName, {});
      const search = normalizeSearchValue(filters.search).toLowerCase();
      const destination = normalizeSearchValue(filters.destination).toLowerCase();
      const items = (Array.isArray(rows) ? rows : []).filter((row) => {
        if (row.is_deleted === true || row.isDeleted === true) {
          return false;
        }
        if (filters.status && row.status !== filters.status) {
          return false;
        }
        if (
          filters.packageCategory &&
          (row.package_category ?? row.packageCategory) !== filters.packageCategory
        ) {
          return false;
        }
        if (
          typeof filters.publishToWebsite === "boolean" &&
          Boolean(row.publish_to_website ?? row.publishToWebsite) !==
            filters.publishToWebsite
        ) {
          return false;
        }
        if (
          typeof filters.isSoldOut === "boolean" &&
          Boolean(row.is_sold_out ?? row.isSoldOut) !== filters.isSoldOut
        ) {
          return false;
        }
        const createdAt = String(row.created_at || row.createdAt || "").slice(0, 10);
        if (filters.createdFrom && createdAt && createdAt < filters.createdFrom) {
          return false;
        }
        if (filters.createdTo && createdAt && createdAt > filters.createdTo) {
          return false;
        }
        if (
          destination &&
          !String(row.destination || "").toLowerCase().includes(destination)
        ) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = [
          row.id,
          row.name,
          row.destination,
          row.status,
          row.package_category,
          row.website_slug,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      });
      return {
        totalPackages: items.length,
        publishedCount: items.filter((item) => item.publish_to_website).length,
        activeCount: items.filter((item) => item.status === "ACTIVE").length,
        soldOutCount: items.filter((item) => item.is_sold_out).length,
        destinationCount: new Set(
          items.map((item) => String(item.destination || "").trim()).filter(Boolean),
        ).size,
        totalValue: items.reduce(
          (sum, item) => sum + Number(item.starting_price || 0),
          0,
        ),
      };
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async create(payload) {
      logger.debug({ module: "packages", payload }, "Creating package");
      return db.insert(schema.tableName, serializeJsonColumns(payload));
    },

    async update(id, payload) {
      logger.debug({ module: "packages", id, payload }, "Updating package");
      return db.update(schema.tableName, id, serializeJsonColumns(payload));
    },

    async softDelete(id) {
      logger.debug({ module: "packages", id }, "Soft deleting package");
      return db.update(schema.tableName, id, { is_deleted: true });
    },

    async restore(id) {
      logger.debug({ module: "packages", id }, "Restoring package");
      return db.update(schema.tableName, id, { is_deleted: false });
    },

    async hardDelete(id) {
      logger.debug({ module: "packages", id }, "Hard deleting package");
      const existing = await db.findById(schema.tableName, id);
      if (!existing) return null;
      await db.query(`DELETE FROM ${schema.tableName} WHERE id = ?`, [id]);
      return existing;
    },

    async createEnquiry(payload) {
      logger.debug({ module: "packages", payload }, "Creating package enquiry");
      return db.insert(schema.enquiriesTable, payload);
    },

    async listEnquiriesByPackageId(packageId) {
      return db.findMany(schema.enquiriesTable, { package_id: packageId });
    },
  });
}

export { createPackagesRepository };
