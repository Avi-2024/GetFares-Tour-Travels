function createPackagesRepository({ db, logger, schema }) {
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
      return db.insert(schema.tableName, payload);
    },

    async update(id, payload) {
      logger.debug({ module: "packages", id, payload }, "Updating package");
      return db.update(schema.tableName, id, payload);
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
