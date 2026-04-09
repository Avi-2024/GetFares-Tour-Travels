function isMissingColumnError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = String(error.message || "");
  return (
    error.code === "42703" ||
    error.code === "ER_BAD_FIELD_ERROR" ||
    /column\s+"[^"]+"\s+.*does not exist/i.test(message) ||
    /unknown column\s+'[^']+'/i.test(message)
  );
}

function getMissingColumnName(error) {
  if (!isMissingColumnError(error)) {
    return null;
  }

  const message = String(error.message || "");
  const relationPattern = /column\s+"([^"]+)"\s+of relation\s+"[^"]+"\s+does not exist/i;
  const genericPattern = /column\s+"([^"]+)"\s+does not exist/i;
  const mysqlPattern = /unknown column\s+'([^']+)'/i;
  const relationMatch = message.match(relationPattern);
  if (relationMatch?.[1]) {
    return relationMatch[1];
  }
  const genericMatch = message.match(genericPattern);
  if (genericMatch?.[1]) {
    return genericMatch[1];
  }
  const mysqlMatch = message.match(mysqlPattern);
  if (mysqlMatch?.[1]) {
    return mysqlMatch[1].split(".").pop();
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

function createVisaRepository({ db, schema }) {
  return Object.freeze({
    async findAll(filters = {}) {
      return runWithColumnFallback(filters, (safeFilters) =>
        db.findMany(schema.tableName, safeFilters),
      );
    },

    async findById(id) {
      return db.findById(schema.tableName, id);
    },

    async findBySlug(slug) {
      return db.findOne(schema.tableName, { slug });
    },

    async create(data) {
      return runWithColumnFallback(data, (safeData) =>
        db.insert(schema.tableName, safeData),
      );
    },

    async update(id, data) {
      return runWithColumnFallback(data, (safeData) =>
        db.update(schema.tableName, id, safeData),
      );
    },

    async delete(id) {
      return db.update(schema.tableName, id, { is_active: false });
    },

    // Details methods
    async findDetails(visaDestinationId, sectionType = null) {
      const filters = { visa_destination_id: visaDestinationId };
      if (sectionType) filters.section_type = sectionType;
      return db.findMany(schema.detailsTable, filters);
    },

    async findDetailById(detailId) {
      return db.findById(schema.detailsTable, detailId);
    },

    async createDetail(data) {
      return db.insert(schema.detailsTable, data);
    },

    async updateDetail(detailId, data) {
      return db.update(schema.detailsTable, detailId, data);
    },

    async deleteDetail(detailId) {
      const existing = await db.findById(schema.detailsTable, detailId);
      if (!existing) {
        return null;
      }
      await db.query(`DELETE FROM ${schema.detailsTable} WHERE id = ?`, [detailId]);
      return existing;
    },
  });
}

export { createVisaRepository };
