const { AppError } = require('../../core/errors');

function createCustomersService({ repository, logger, events }) {
  async function getById(id, context = {}) {
    logger.debug({ module: 'customers', requestId: context.requestId, id }, 'Getting record by id');
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, 'Customers not found', 'customers_NOT_FOUND');
    }

    return item;
  }

  return Object.freeze({
    list(filters = {}, context = {}) {
      logger.debug({ module: 'customers', requestId: context.requestId, filters }, 'Listing records');
      return repository.findAll(filters);
    },

    getById,

    async create(payload) {
      const created = await repository.create({
        full_name: payload.fullName || null,
        phone: payload.phone || null,
        email: payload.email || null,
        preferences: payload.preferences || null,
        lifetime_value: payload.lifetimeValue ?? 0,
        segment: payload.segment || 'NEW',
        is_deleted: payload.isDeleted ?? false,
      });

      events.emitCreated(created);
      return created;
    },

    async update(id, payload, context = {}) {
      await getById(id, context);

      const mapped = {};

      if (payload.fullName !== undefined) {
        mapped.full_name = payload.fullName;
      }
      if (payload.phone !== undefined) {
        mapped.phone = payload.phone;
      }
      if (payload.email !== undefined) {
        mapped.email = payload.email;
      }
      if (payload.preferences !== undefined) {
        mapped.preferences = payload.preferences;
      }
      if (payload.lifetimeValue !== undefined) {
        mapped.lifetime_value = payload.lifetimeValue;
      }
      if (payload.segment !== undefined) {
        mapped.segment = payload.segment;
      }
      if (payload.isDeleted !== undefined) {
        mapped.is_deleted = payload.isDeleted;
      }

      const updated = await repository.update(id, mapped);
      events.emitUpdated(updated);
      return updated;
    },
  });
}

module.exports = { createCustomersService };
