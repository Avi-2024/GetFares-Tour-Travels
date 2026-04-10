function createCountriesRepository({ db, logger, schema }) {
  async function findAll({ includeInactive = true, search = null } = {}) {
    if (db.adapter === "mysql") {
      const values = [];
      const filters = [];

      if (!includeInactive) {
        filters.push("c.is_active = 1");
      }
      if (search) {
        values.push(`%${search}%`);
        values.push(`%${search}%`);
        filters.push(`(c.name LIKE ? OR c.code LIKE ?)`);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const result = await db.query(
        `
          SELECT c.*
          FROM ${schema.tableName} c
          ${whereClause}
          ORDER BY c.name ASC
        `,
        values,
      );
      return result.rows;
    }

    const rows = await db.findMany(schema.tableName, {});
    const normalizedSearch = search ? String(search).toLowerCase() : null;
    return rows
      .filter((row) => includeInactive || row.is_active !== false)
      .filter((row) => {
        if (!normalizedSearch) return true;
        return (
          String(row.name || "").toLowerCase().includes(normalizedSearch) ||
          String(row.code || "").toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }

  async function findById(id) {
    return db.findById(schema.tableName, id);
  }

  async function findByCode(code) {
    if (!code) return null;
    if (db.adapter === "mysql") {
      const result = await db.query(
        `
          SELECT *
          FROM ${schema.tableName}
          WHERE LOWER(code) = LOWER(?)
          LIMIT 1
        `,
        [code],
      );
      return result.rows[0] || null;
    }
    const all = await db.findMany(schema.tableName, {});
    return (
      all.find(
        (row) => String(row.code || "").toLowerCase() === String(code).toLowerCase(),
      ) || null
    );
  }

  async function findByName(name) {
    if (!name) return null;
    if (db.adapter === "mysql") {
      const result = await db.query(
        `
          SELECT *
          FROM ${schema.tableName}
          WHERE LOWER(name) = LOWER(?)
          LIMIT 1
        `,
        [name],
      );
      return result.rows[0] || null;
    }
    const all = await db.findMany(schema.tableName, {});
    return (
      all.find(
        (row) => String(row.name || "").toLowerCase() === String(name).toLowerCase(),
      ) || null
    );
  }

  async function create(payload) {
    logger.debug({ module: "countries", payload }, "Creating country");
    return db.insert(schema.tableName, payload);
  }

  async function update(id, payload) {
    logger.debug({ module: "countries", id, payload }, "Updating country");
    return db.update(schema.tableName, id, payload);
  }

  async function countUsage(countryId) {
    if (db.adapter === "mysql") {
      const result = await db.query(
        `
          SELECT
            (
              SELECT COUNT(*)
              FROM ${schema.userCountriesTable} uc
              WHERE uc.country_id = ?
            ) AS users_count,
            (
              SELECT COUNT(*)
              FROM ${schema.leadsTable} l
              WHERE l.country_id = ?
            ) AS leads_count
        `,
        [countryId, countryId],
      );
      return {
        usersCount: Number(result.rows[0]?.users_count || 0),
        leadsCount: Number(result.rows[0]?.leads_count || 0),
      };
    }

    return { usersCount: 0, leadsCount: 0 };
  }

  return Object.freeze({
    findAll,
    findById,
    findByCode,
    findByName,
    create,
    update,
    countUsage,
  });
}

export { createCountriesRepository };
