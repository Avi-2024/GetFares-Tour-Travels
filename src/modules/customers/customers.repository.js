function createCustomersRepository({ db, logger, schema }) {
  function toDomain(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      preferences: row.preferences ?? null,
      lifetimeValue: Number(row.lifetime_value ?? row.lifetimeValue ?? 0),
      segment: row.segment ?? 'NEW',
      isDeleted: Boolean(row.is_deleted ?? row.isDeleted ?? false),
      createdAt: row.created_at ?? row.createdAt ?? null,
    };
  }

  return Object.freeze({
    async findAll(filters = {}) {
      const mappedFilters = {};
      if (filters.page) {
        mappedFilters.page = filters.page;
      }
      if (filters.limit) {
        mappedFilters.limit = filters.limit;
      }
      if (filters.segment) {
        mappedFilters.segment = filters.segment;
      }
      if (filters.email) {
        mappedFilters.email = filters.email;
      }
      if (filters.phone) {
        mappedFilters.phone = filters.phone;
      }
      if (filters.isDeleted !== undefined) {
        mappedFilters.is_deleted = filters.isDeleted;
      }

      const rows = await db.findMany(schema.tableName, mappedFilters);
      return rows.map((row) => toDomain(row));
    },

    async findById(id) {
      const row = await db.findById(schema.tableName, id);
      return toDomain(row);
    },

    async create(payload) {
      logger.debug({ module: 'customers', payload }, 'Creating record');
      const row = await db.insert(schema.tableName, payload);
      return toDomain(row);
    },

    async update(id, payload) {
      logger.debug({ module: 'customers', id, payload }, 'Updating record');
      const row = await db.update(schema.tableName, id, payload);
      return toDomain(row);
    },
  });
}

module.exports = { createCustomersRepository };
