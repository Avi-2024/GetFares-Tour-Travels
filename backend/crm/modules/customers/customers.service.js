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
    lifetimeValue:
      Number(bookingSummary?.lifetimeValue ?? 0) > 0 ?
        Number(bookingSummary.lifetimeValue)
      : (entity.lifetime_value ?? entity.lifetimeValue ?? 0),
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

function toCustomerLead(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    leadId:
      entity.lead_code ??
      entity.leadCode ??
      entity.meta_lead_id ??
      entity.metaLeadId ??
      entity.id,
    status: entity.status ?? null,
    subStatus: entity.sub_status ?? entity.subStatus ?? null,
    leadType: entity.lead_type ?? entity.leadType ?? null,
    destination:
      entity.destination_name ??
      entity.destinationName ??
      entity.travel_to ??
      entity.travelTo ??
      entity.lead_country ??
      entity.leadCountry ??
      null,
    source: entity.source ?? null,
    consultant:
      entity.assigned_user_name ??
      entity.assignedUserName ??
      entity.consultant ??
      null,
    assignedTo: entity.assigned_to ?? entity.assignedTo ?? null,
    createdAt: entity.created_at ?? entity.createdAt ?? null,
    updatedAt: entity.updated_at ?? entity.updatedAt ?? null,
  };
}

function toCustomerBooking(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    bookingNumber:
      entity.booking_number ??
      entity.bookingNumber ??
      entity.id,
    destination:
      entity.destination_name ??
      entity.destinationName ??
      entity.travel_to ??
      entity.travelTo ??
      entity.lead_country ??
      entity.leadCountry ??
      null,
    travelDate:
      entity.travel_start_date ??
      entity.travelStartDate ??
      entity.created_at ??
      entity.createdAt ??
      null,
    amount: Number(entity.total_amount ?? entity.totalAmount ?? 0),
    status: entity.status ?? "PENDING",
    createdAt: entity.created_at ?? entity.createdAt ?? null,
    quotationId: entity.quotation_id ?? entity.quotationId ?? null,
  };
}

function buildBookingSummaryFromRows(rows = []) {
  const items = Array.isArray(rows) ? rows.map(toCustomerBooking).filter(Boolean) : [];
  const totalBookings = items.length;
  const lifetimeValue = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const lastBookingDate = items.reduce((latest, item) => {
    const value = item.travelDate || item.createdAt || null;
    if (!value) return latest;
    if (!latest) return value;
    return new Date(value).getTime() > new Date(latest).getTime() ? value : latest;
  }, null);

  return {
    totalBookings,
    lifetimeValue,
    lastBookingDate,
  };
}

function buildPaymentOptions(rows = []) {
  const customerMap = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const customerId = String(row?.customer_id ?? row?.customerId ?? "");
    const bookingId = String(row?.booking_id ?? row?.bookingId ?? row?.id ?? "");
    if (!customerId || !bookingId) return;

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        fullName: row?.full_name ?? row?.fullName ?? null,
        email: row?.email ?? null,
        phone: row?.phone ?? null,
        clientCurrency:
          row?.client_currency ?? row?.clientCurrency ?? "INR",
        bookings: [],
        bookingIds: new Set(),
      });
    }

    const entry = customerMap.get(customerId);
    if (entry.bookingIds.has(bookingId)) {
      return;
    }

    entry.bookingIds.add(bookingId);
    entry.bookings.push({
      id: bookingId,
      bookingNumber:
        row?.booking_number ??
        row?.bookingNumber ??
        bookingId,
      destination:
        row?.destination_name ??
        row?.destinationName ??
        row?.travel_to ??
        row?.travelTo ??
        row?.lead_country ??
        row?.leadCountry ??
        null,
      travelDate:
        row?.travel_start_date ??
        row?.travelStartDate ??
        row?.created_at ??
        row?.createdAt ??
        null,
      amount: Number(row?.total_amount ?? row?.totalAmount ?? 0),
      currency:
        row?.client_currency ?? row?.clientCurrency ?? "INR",
      status: row?.status ?? "PENDING",
      createdAt: row?.created_at ?? row?.createdAt ?? null,
      quotationId: row?.quotation_id ?? row?.quotationId ?? null,
    });
  });

  return Array.from(customerMap.values())
    .map((entry) => ({
      customerId: entry.customerId,
      fullName: entry.fullName,
      email: entry.email,
      phone: entry.phone,
      clientCurrency: entry.clientCurrency,
      bookings: entry.bookings.sort(
        (left, right) =>
          new Date(right?.createdAt || right?.travelDate || 0).getTime() -
          new Date(left?.createdAt || left?.travelDate || 0).getTime(),
      ),
    }))
    .filter((entry) => entry.bookings.length > 0);
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
    const mapped = toCustomer(
      item,
      bookingSummaryByCustomerId.get(String(item.id ?? id)) || null,
    );
    const needsBookingFallback =
      !mapped.totalBookings ||
      !mapped.lastBookingDate ||
      !Number(mapped.lifetimeValue || 0);

    if (!needsBookingFallback) {
      return mapped;
    }

    const bookingRows = await repository.findBookingsByCustomerId(id, mapped);
    const fallbackSummary = buildBookingSummaryFromRows(bookingRows);

    return {
      ...mapped,
      totalBookings: fallbackSummary.totalBookings || mapped.totalBookings,
      lastBookingDate: fallbackSummary.lastBookingDate || mapped.lastBookingDate,
      lifetimeValue:
        Number(mapped.lifetimeValue || 0) > 0 ?
          mapped.lifetimeValue
        : fallbackSummary.lifetimeValue,
    };
  }

  async function getLeads(id, context = {}) {
    const customer = await getById(id, context);
    const rows = await repository.findLeadsByCustomerId(id, customer);
    const items = (Array.isArray(rows) ? rows : [])
      .map(toCustomerLead)
      .filter(Boolean);

    return {
      items,
      totalLeads: items.length,
    };
  }

  async function getBookings(id, context = {}) {
    const customer = await getById(id, context);
    const rows = await repository.findBookingsByCustomerId(id, customer);
    const items = (Array.isArray(rows) ? rows : [])
      .map(toCustomerBooking)
      .filter(Boolean);

    return {
      items,
      totalBookings: items.length,
    };
  }

  async function getPaymentOptions(context = {}) {
    logger.debug(
      { module: "customers", requestId: context.requestId },
      "Getting payment options",
    );
    const rows = await repository.findPaymentOptions();
    const items = buildPaymentOptions(rows);

    return {
      items,
      totalCustomers: items.length,
      totalBookings: items.reduce(
        (sum, item) => sum + Number(item.bookings.length || 0),
        0,
      ),
    };
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
    getLeads,
    getBookings,
    getPaymentOptions,
    create,
    update,
    remove,
  });
}

export { createCustomersService };
