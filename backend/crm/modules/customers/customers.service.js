import { AppError } from "../../core/errors/index.js";

function mapListFilters(filters = {}) {
  return {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    segment: filters.segment,
    email: filters.email,
    phone: filters.phone,
    client_currency: filters.clientCurrency,
    clientCurrency: filters.clientCurrency,
  };
}

function normalizePhone(value) {
  if (!value) return null;
  const compact = String(value).trim().replace(/\s+/g, "");
  const normalized = compact.replace(/[^\d+]/g, "");
  return normalized || null;
}

function mapCreatePayload(payload) {
  return {
    full_name: payload.fullName,
    phone: payload.phone,
    phone_normalized: normalizePhone(payload.phone),
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
    phone_normalized: normalizePhone(payload.phone),
    email: payload.email,
    preferences: payload.preferences,
    lifetime_value: payload.lifetimeValue,
    segment: payload.segment,
    pan_number: payload.panNumber,
    address_line: payload.addressLine,
    client_currency: payload.clientCurrency,
  };
}

function toCustomer(entity, bookingSummary = null) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    fullName: entity.full_name ?? entity.fullName ?? null,
    phone: entity.phone ?? null,
    email: entity.email ?? null,
    preferences: entity.preferences ?? null,
    lifetimeValue: entity.lifetime_value ?? entity.lifetimeValue ?? 0,
    segment: entity.segment ?? "NEW",
    panNumber: entity.pan_number ?? entity.panNumber ?? null,
    addressLine: entity.address_line ?? entity.addressLine ?? null,
    clientCurrency:
      entity.client_currency ?? entity.clientCurrency ?? "INR",
    createdAt: entity.created_at ?? entity.createdAt ?? null,
    totalBookings: Number(
      bookingSummary?.totalBookings ??
        entity.total_bookings ??
        entity.totalBookings ??
        0,
    ),
    lastBookingDate: bookingSummary?.lastBookingDate ?? null,
    lastBookingNumber: bookingSummary?.lastBookingNumber ?? null,
  };
}

function createCustomersService({ repository, leadsRepository, logger, events }) {
  async function list(filters = {}, context = {}) {
    const mappedFilters = mapListFilters(filters);
    logger.debug(
      {
        module: "customers",
        requestId: context.requestId,
        filters: mappedFilters,
      },
      "Listing records",
    );
    let result = await repository.findAll(mappedFilters);
    if (
      (!(Array.isArray(result?.items) ? result.items.length : 0) &&
        !(result?.pagination?.totalItems > 0)) &&
      typeof repository.backfillFromLeads === "function"
    ) {
      await repository.backfillFromLeads();
      result = await repository.findAll(mappedFilters);
    }

    const activeRows = (Array.isArray(result?.items) ? result.items : []).filter(
      (row) => !(row.is_deleted ?? row.isDeleted),
    );
    const bookingSummaryByCustomerId =
      await repository.findBookingSummaryByCustomerIds(
        activeRows.map((row) => row.id),
      );
    const items = activeRows.map((row) =>
      toCustomer(row, bookingSummaryByCustomerId.get(String(row.id)) || null),
    );
    const summary = typeof repository.summarizeList === "function"
      ? await repository.summarizeList(mappedFilters)
      : {
          totalCustomers: Number(result?.pagination?.totalItems || items.length || 0),
          newCustomers: items.filter((row) => row.segment === "NEW").length,
          platinumCustomers: items.filter((row) => row.segment === "PLATINUM").length,
          averageLifetimeValue: items.length
            ? items.reduce((sum, row) => sum + Number(row.lifetimeValue || 0), 0) /
              items.length
            : 0,
          totalBookings: items.reduce(
            (sum, row) => sum + Number(row.totalBookings || 0),
            0,
          ),
        };

    return {
      items,
      pagination: result?.pagination || {
        page: 1,
        limit: items.length,
        totalItems: items.length,
        totalPages: 1,
      },
      summary,
    };
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "customers", requestId: context.requestId, id },
      "Getting record by id",
    );
    const item = await repository.findById(id);

    if (!item) {
      throw new AppError(404, "Customers not found", "CUSTOMERS_NOT_FOUND");
    }

    const bookingSummaryByCustomerId =
      await repository.findBookingSummaryByCustomerIds([id]);
    return toCustomer(
      item,
      bookingSummaryByCustomerId.get(String(item.id ?? id)) || null,
    );
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

  async function remove(id, context = {}) {
    await getById(id, context);
    const updated = await repository.update(id, { is_deleted: true });
    events.emitUpdated(updated);
    return toCustomer(updated);
  }

  return Object.freeze({
    list,
    getById,
    create,
    update,
    remove,
  });
}

export { createCustomersService };
