function createDestinationsRepository({ db, logger, schema }) {
  function mapDestinationFilters(filters = {}) {
    const mapped = {};

    if (typeof filters.isActive === "boolean") {
      mapped.is_active = filters.isActive;
    }

    return mapped;
  }

  async function findPricingForDestinationIds(destinationIds = []) {
    const normalizedIds = [...new Set(destinationIds.filter(Boolean))];
    if (!normalizedIds.length) {
      return [];
    }

    if (typeof db.query === "function") {
      const result = await db.query(
        `SELECT * FROM ${schema.pricingTable} WHERE destination_id IN (?)`,
        [normalizedIds],
      );
      return result.rows || [];
    }

    const batches = await Promise.all(
      normalizedIds.map((destinationId) =>
        db.findMany(schema.pricingTable, {
          destination_id: destinationId,
        }),
      ),
    );
    return batches.flat();
  }

  return Object.freeze({
    async findDestinations(filters = {}) {
      return db.findMany(schema.destinationsTable, mapDestinationFilters(filters));
    },

    async findDestinationById(id) {
      return db.findById(schema.destinationsTable, id);
    },

    async createDestination(payload) {
      logger.debug({ module: "destinations", payload }, "Creating destination");
      return db.insert(schema.destinationsTable, payload);
    },

    async updateDestination(id, payload) {
      logger.debug(
        { module: "destinations", id, payload },
        "Updating destination",
      );
      return db.update(schema.destinationsTable, id, payload);
    },

    async findPricingByDestinationId(destinationId) {
      return db.findMany(schema.pricingTable, { destination_id: destinationId });
    },

    findPricingForDestinationIds,

    async findPricingById(id) {
      return db.findById(schema.pricingTable, id);
    },

    async createPricing(payload) {
      logger.debug({ module: "destinations", payload }, "Creating destination pricing");
      return db.insert(schema.pricingTable, payload);
    },

    async updatePricing(id, payload) {
      logger.debug(
        { module: "destinations", id, payload },
        "Updating destination pricing",
      );
      return db.update(schema.pricingTable, id, payload);
    },
  });
}

export { createDestinationsRepository };
