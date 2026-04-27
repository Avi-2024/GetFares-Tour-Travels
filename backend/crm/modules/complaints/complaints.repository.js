function createComplaintsRepository({ db, logger, schema }) {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 10;
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

  function buildSortSql(filters = {}) {
    const sortBy = String(filters.sortBy || "createdAt").trim();
    const sortOrder =
      String(filters.sortOrder || "desc").trim().toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    let sortExpression = "COALESCE(c.created_at, '1970-01-01 00:00:00')";
    if (sortBy === "status") {
      sortExpression = "COALESCE(c.status, '')";
    } else if (sortBy === "issueType") {
      sortExpression = "COALESCE(c.issue_type, '')";
    } else if (sortBy === "createdAt") {
      sortExpression = "COALESCE(c.created_at, '1970-01-01 00:00:00')";
    }

    return `${sortExpression} ${sortOrder}, c.id DESC`;
  }

  function buildWhere(filters = {}) {
    const where = ["1 = 1"];
    const params = [];

    if (filters.status) {
      where.push("c.status = ?");
      params.push(filters.status);
    }
    if (filters.assignedTo) {
      where.push("c.assigned_to = ?");
      params.push(filters.assignedTo);
    }
    if (filters.bookingId) {
      where.push("c.booking_id = ?");
      params.push(filters.bookingId);
    }
    if (filters.createdFrom) {
      where.push("DATE(c.created_at) >= ?");
      params.push(filters.createdFrom);
    }
    if (filters.createdTo) {
      where.push("DATE(c.created_at) <= ?");
      params.push(filters.createdTo);
    }

    const search = normalizeSearchValue(filters.search);
    if (search) {
      const wildcard = `%${escapeLike(search.toLowerCase())}%`;
      where.push(`(
        LOWER(COALESCE(c.id, '')) LIKE ?
        OR LOWER(COALESCE(c.booking_id, '')) LIKE ?
        OR LOWER(COALESCE(c.issue_type, '')) LIKE ?
        OR LOWER(COALESCE(c.description, '')) LIKE ?
        OR LOWER(COALESCE(c.status, '')) LIKE ?
        OR LOWER(COALESCE(b.booking_number, '')) LIKE ?
        OR LOWER(COALESCE(l.full_name, '')) LIKE ?
        OR LOWER(COALESCE(l.email, '')) LIKE ?
        OR LOWER(COALESCE(l.phone, '')) LIKE ?
        OR LOWER(COALESCE(u.full_name, '')) LIKE ?
        OR LOWER(COALESCE(u.email, '')) LIKE ?
      )`);
      params.push(
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
        wildcard,
      );
    }

    return {
      whereSql: where.join(" AND "),
      params,
    };
  }

  function sortInMemory(rows = [], filters = {}) {
    const sortBy = String(filters.sortBy || "createdAt").trim();
    const factor =
      String(filters.sortOrder || "desc").trim().toLowerCase() === "asc"
        ? 1
        : -1;

    return rows.slice().sort((left, right) => {
      let comparison = 0;
      if (sortBy === "status") {
        comparison = String(left.status || "").localeCompare(
          String(right.status || ""),
        );
      } else if (sortBy === "issueType") {
        comparison = String(left.issue_type || left.issueType || "").localeCompare(
          String(right.issue_type || right.issueType || ""),
        );
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

  function buildComplaintJoins() {
    return `
      LEFT JOIN ${schema.bookingsTable} b ON b.id = c.booking_id
      LEFT JOIN ${schema.quotationsTable} q ON q.id = b.quotation_id
      LEFT JOIN ${schema.leadsTable} l ON l.id = q.lead_id
      LEFT JOIN ${schema.usersTable} u ON u.id = c.assigned_to
    `;
  }

  function buildComplaintSelect() {
    return `
      c.*,
      b.booking_number,
      l.full_name AS customer_name,
      l.email AS customer_email,
      l.phone AS customer_phone,
      u.full_name AS assigned_to_name,
      u.email AS assigned_to_email
    `;
  }

  async function findAll(filters = {}) {
    const pagination = normalizePagination(filters);

    if (canUseRawQuery()) {
      const where = buildWhere(filters);
      const joins = buildComplaintJoins();
      const countResult = await db.query(
        `
          SELECT COUNT(*) AS total_count
          FROM ${schema.tableName} c
          ${joins}
          WHERE ${where.whereSql}
        `,
        where.params,
      );
      const totalItems = Number(countResult.rows?.[0]?.total_count || 0);
      const rowsResult = await db.query(
        `
          SELECT ${buildComplaintSelect()}
          FROM ${schema.tableName} c
          ${joins}
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

    const rows = await db.findMany(schema.tableName, {});
    const filtered = (Array.isArray(rows) ? rows : []).filter((row) => {
      if (filters.status && row.status !== filters.status) {
        return false;
      }
      if (filters.assignedTo && row.assigned_to !== filters.assignedTo) {
        return false;
      }
      if (filters.bookingId && row.booking_id !== filters.bookingId) {
        return false;
      }
      const createdAt = String(row.created_at || row.createdAt || "").slice(0, 10);
      if (filters.createdFrom && createdAt && createdAt < filters.createdFrom) {
        return false;
      }
      if (filters.createdTo && createdAt && createdAt > filters.createdTo) {
        return false;
      }
      const search = normalizeSearchValue(filters.search).toLowerCase();
      if (!search) {
        return true;
      }
      const haystack = [
        row.id,
        row.booking_id,
        row.issue_type,
        row.description,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });

    const sorted = sortInMemory(filtered, filters);
    const items = sorted.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / pagination.limit)),
      },
    };
  }

  async function findById(id) {
    if (canUseRawQuery()) {
      const result = await db.query(
        `
          SELECT ${buildComplaintSelect()}
          FROM ${schema.tableName} c
          ${buildComplaintJoins()}
          WHERE c.id = ?
          LIMIT 1
        `,
        [id],
      );

      return Array.isArray(result?.rows) ? result.rows[0] || null : null;
    }

    return db.findById(schema.tableName, id);
  }

  async function create(payload) {
    logger.debug({ module: "complaints", payload }, "Creating record");
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: "complaints", id, payload }, "Updating record");
    return db.update(schema.tableName, id, payload);
  }

  async function findActivities(complaintId, filters = {}) {
    if (canUseRawQuery()) {
      const page = toPositiveInt(filters.page, DEFAULT_PAGE);
      const limit = Math.min(MAX_LIMIT, toPositiveInt(filters.limit, DEFAULT_LIMIT));
      const offset = (page - 1) * limit;

      const result = await db.query(
        `
          SELECT
            a.*,
            u.full_name AS user_name,
            u.email AS user_email
          FROM ${schema.activitiesTable} a
          LEFT JOIN ${schema.usersTable} u ON u.id = a.user_id
          WHERE a.complaint_id = ?
          ORDER BY COALESCE(a.created_at, '1970-01-01 00:00:00') DESC, a.id DESC
          LIMIT ?
          OFFSET ?
        `,
        [complaintId, limit, offset],
      );

      return Array.isArray(result?.rows) ? result.rows : [];
    }

    return db.findMany(schema.activitiesTable, {
      complaint_id: complaintId,
      ...filters,
    });
  }

  async function createActivity(payload) {
    logger.debug(
      { module: "complaints", payload },
      "Creating complaint activity",
    );
    return db.insert(schema.activitiesTable, payload);
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    findActivities,
    createActivity,
  });
}

export { createComplaintsRepository };
