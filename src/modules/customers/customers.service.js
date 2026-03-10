const { AppError } = require('../../core/errors');

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    segment: filters.segment,
    email: filters.email,
    phone: filters.phone,
    client_currency: filters.clientCurrency,
  };
}

function mapCreatePayload(payload) {
  return {
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    preferences: payload.preferences,
    lifetime_value: payload.lifetimeValue,
    segment: payload.segment,
    pan_number: payload.panNumber,
    address_line: payload.addressLine,
    client_currency: payload.clientCurrency,
  };
}

function mapUpdatePayload(payload) {
  return {
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    preferences: payload.preferences,
    lifetime_value: payload.lifetimeValue,
    segment: payload.segment,
    pan_number: payload.panNumber,
    address_line: payload.addressLine,
    client_currency: payload.clientCurrency,
  };
}

function toCustomer(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    fullName: entity.full_name,
    phone: entity.phone,
    email: entity.email,
    preferences: entity.preferences,
    lifetimeValue: entity.lifetime_value,
    segment: entity.segment,
    panNumber: entity.pan_number,
    addressLine: entity.address_line,
    clientCurrency: entity.client_currency,
    createdAt: entity.created_at,
  };
}

function createCustomersService({ repository, logger, events }) {
  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug({ module: 'customers', requestId: context.requestId, filters: mappedFilters }, 'Listing records');
    const rows = await repository.findAll(mappedFilters);
    return rows.map(toCustomer);
  }

  async function getById(id, context = {}) {
    logger.debug({ module: 'customers', requestId: context.requestId, id }, 'Getting record by id');
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, 'Customers not found', 'CUSTOMERS_NOT_FOUND');
    }

    return toCustomer(item);
  }

  async function create(payload) {
    const created = await repository.create(mapCreatePayload(payload));
    events.emitCreated(created);
    return toCustomer(created);
  }

  async function update(id, payload, context = {}) {
    await getById(id, context);

    const updated = await repository.update(id, mapUpdatePayload(payload));
    events.emitUpdated(updated);
    return toCustomer(updated);
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
  });
}

module.exports = { createCustomersService };
