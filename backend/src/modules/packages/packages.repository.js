function createPackagesRepository({ db, logger, schema }) {
  const PACKAGE_JSON_COLUMNS = new Set([
    "custom_services",
    "itinerary",
  ]);

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
      const mapped = {};
      if (filters.status) mapped.status = filters.status;
      if (filters.packageCategory) mapped.package_category = filters.packageCategory;
      if (typeof filters.publishToWebsite === "boolean") {
        mapped.publish_to_website = filters.publishToWebsite;
      }
      if (typeof filters.isSoldOut === "boolean") {
        mapped.is_sold_out = filters.isSoldOut;
      }
      return db.findMany(schema.tableName, mapped);
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
