import { AppError } from "../../core/errors/index.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const SERVICE_LABEL_BY_KEY = Object.freeze({
  hotel: "Accommodation",
  flights: "Flights",
  tours: "Tours & Activities",
  visa: "Visa Services",
  insurance: "Insurance",
  insurance2: "Land Arrangement",
});

const SERVICE_LABEL_BY_ITEM_TYPE = Object.freeze({
  HOTEL: "Accommodation",
  FLIGHT: "Flights",
  TRANSFER: "Land Arrangement",
  VISA: "Visa Services",
  INSURANCE: "Insurance",
  OTHER: "Other",
});

function normalizeServiceToken(value) {
  if (!value) {
    return "Other";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "Other";
  }

  const keyLabel = SERVICE_LABEL_BY_KEY[trimmed.toLowerCase()];
  if (keyLabel) {
    return keyLabel;
  }

  const itemTypeLabel = SERVICE_LABEL_BY_ITEM_TYPE[trimmed.toUpperCase()];
  if (itemTypeLabel) {
    return itemTypeLabel;
  }

  return trimmed;
}

function normalizeServiceNames(value) {
  if (!value) {
    return "Other";
  }

  const tokens = String(value)
    .split(",")
    .map((token) => normalizeServiceToken(token))
    .filter((token) => Boolean(token));

  if (!tokens.length) {
    return "Other";
  }

  return Array.from(new Set(tokens)).join(", ");
}

function toSupplier(entity) {
  if (!entity) {
    return null;
  }

  const pick = (...values) => values.find((value) => value !== undefined);
  const toBoolean = (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value === 1;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
    return Boolean(value);
  };

  return {
    id: pick(entity.id),
    name: pick(entity.name),
    contactPerson: pick(entity.contact_person, entity.contactPerson),
    phone: pick(entity.phone),
    email: pick(entity.email),
    panNumber: pick(entity.pan_number, entity.panNumber),
    gstNumber: pick(entity.gst_number, entity.gstNumber),
    address: pick(entity.address),
    addressLine: pick(entity.address_line, entity.addressLine, entity.address),
    country: pick(entity.country),
    invoiceBeneficiaryName: pick(
      entity.invoice_beneficiary_name,
      entity.invoiceBeneficiaryName,
    ),
    invoiceBankName: pick(entity.invoice_bank_name, entity.invoiceBankName),
    invoiceAccountNumber: pick(
      entity.invoice_account_number,
      entity.invoiceAccountNumber,
    ),
    invoiceIfscSwift: pick(
      entity.invoice_ifsc_swift,
      entity.invoiceIfscSwift,
    ),
    invoiceUpiId: pick(entity.invoice_upi_id, entity.invoiceUpiId),
    bankName: pick(entity.bank_name, entity.bankName),
    bankAccountNumber: pick(
      entity.bank_account_number,
      entity.bankAccountNumber,
    ),
    ifscCode: pick(entity.ifsc_code, entity.ifscCode),
    supplierCurrency: pick(
      entity.supplier_currency,
      entity.supplierCurrency,
      "INR",
    ),
    contractUrl: pick(entity.contract_url, entity.contractUrl),
    rateValidUntil: pick(entity.rate_valid_until, entity.rateValidUntil),
    productionCommitment: pick(
      entity.production_commitment,
      entity.productionCommitment,
    ),
    paymentDeadlineDate: pick(
      entity.payment_deadline_date,
      entity.paymentDeadlineDate,
    ),
    isActive: toBoolean(pick(entity.is_active, entity.isActive)),
    isDeleted: toBoolean(pick(entity.is_deleted, entity.isDeleted)),
    createdAt: pick(entity.created_at, entity.createdAt),
  };
}

function toPayable(entity) {
  if (!entity) {
    return null;
  }

  const dueDateRaw = entity.due_date ?? entity.dueDate ?? null;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const now = new Date();
  const dueInDays =
    dueDate && !Number.isNaN(dueDate.getTime())
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;

  const payableAmount = toNumber(entity.payable_amount, 0);
  const paidAmount = toNumber(entity.paid_amount, 0);
  const pendingAmount = Number(Math.max(0, payableAmount - paidAmount).toFixed(2));

  return {
    id: entity.id,
    bookingId: entity.booking_id,
    supplierId: entity.supplier_id,
    supplierName: entity.supplier_name ?? entity.supplierName ?? null,
    payableAmount,
    paidAmount,
    pendingAmount,
    dueDate: dueDateRaw,
    dueInDays,
    status: entity.status,
    paymentReference: entity.payment_reference,
    lastPaidAt: entity.last_paid_at,
    createdAt: entity.created_at,
  };
}

function toSettlement(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    payableId: entity.payable_id ?? entity.payableId,
    supplierId: entity.supplier_id ?? entity.supplierId,
    bookingId: entity.booking_id ?? entity.bookingId,
    bookingNumber: entity.booking_number ?? entity.bookingNumber ?? null,
    settlementAmount: toNumber(
      entity.settlement_amount ?? entity.settlementAmount,
      0,
    ),
    paymentMode: entity.payment_mode ?? entity.paymentMode ?? "BANK_TRANSFER",
    settlementDate: entity.settlement_date ?? entity.settlementDate ?? null,
    reference: entity.reference ?? null,
    notes: entity.notes ?? null,
    createdBy: entity.created_by ?? entity.createdBy ?? null,
    createdByName: entity.created_by_name ?? entity.createdByName ?? null,
    payableAmount: toNumber(entity.payable_amount, 0),
    paidAmount: toNumber(entity.paid_amount, 0),
    payableStatus: entity.payable_status ?? entity.payableStatus ?? null,
    createdAt: entity.created_at ?? entity.createdAt ?? null,
  };
}

function createSuppliersService({ repository, logger, events }) {
  function pickFirst(payload, keys = []) {
    for (const key of keys) {
      if (payload?.[key] !== undefined && payload?.[key] !== null) {
        return payload[key];
      }
    }
    return undefined;
  }

  function pickText(payload, keys = []) {
    const value = pickFirst(payload, keys);
    if (value === undefined || value === null) {
      return undefined;
    }
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  function pickBoolean(payload, keys = []) {
    const value = pickFirst(payload, keys);
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value === 1;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
    return undefined;
  }

  function pickDate(payload, keys = []) {
    const value = pickFirst(payload, keys);
    if (value === undefined || value === null) {
      return undefined;
    }
    if (String(value).trim() === "") {
      return null;
    }
    return toDateOnly(value);
  }

  function toDateOnly(value) {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString().slice(0, 10);
  }

  function normalizeAlertType(value) {
    return String(value || "").trim().toUpperCase();
  }

  function mapListFilters(filters = {}) {
    return {
      page: filters.page,
      limit: filters.limit,
      name: filters.name,
      country: filters.country,
      supplier_currency: filters.supplierCurrency,
      is_active: filters.isActive,
    };
  }

  function mapCreatePayload(payload) {
    return {
      name: pickText(payload, ["name", "fullName", "full_name"]),
      contact_person: pickText(payload, ["contactPerson", "contact_person"]),
      phone: pickText(payload, ["phone"]),
      email: pickText(payload, ["email"]),
      pan_number: pickText(payload, ["panNumber", "pan_number"]),
      gst_number: pickText(payload, ["gstNumber", "gst_number"]),
      address_line: pickText(payload, ["addressLine", "address_line", "address"]),
      country: pickText(payload, ["country"]),
      invoice_beneficiary_name: pickText(payload, [
        "invoiceBeneficiaryName",
        "invoice_beneficiary_name",
      ]),
      invoice_bank_name: pickText(payload, ["invoiceBankName", "invoice_bank_name"]),
      invoice_account_number: pickText(payload, [
        "invoiceAccountNumber",
        "invoice_account_number",
      ]),
      invoice_ifsc_swift: pickText(payload, [
        "invoiceIfscSwift",
        "invoice_ifsc_swift",
      ]),
      invoice_upi_id: pickText(payload, ["invoiceUpiId", "invoice_upi_id"]),
      bank_name: pickText(payload, ["bankName", "bank_name"]),
      bank_account_number: pickText(payload, [
        "bankAccountNumber",
        "bank_account_number",
      ]),
      ifsc_code: pickText(payload, ["ifscCode", "ifsc_code"]),
      supplier_currency: pickText(payload, [
        "supplierCurrency",
        "supplier_currency",
        "currency",
      ]),
      contract_url: pickText(payload, ["contractUrl", "contract_url"]),
      rate_valid_until: pickDate(payload, ["rateValidUntil", "rate_valid_until"]),
      production_commitment: pickText(payload, [
        "productionCommitment",
        "production_commitment",
      ]),
      payment_deadline_date: pickDate(payload, [
        "paymentDeadlineDate",
        "payment_deadline_date",
      ]),
      is_active: pickBoolean(payload, ["isActive", "is_active"]),
    };
  }

  function mapUpdatePayload(payload) {
    return {
      name: pickText(payload, ["name", "fullName", "full_name"]),
      contact_person: pickText(payload, ["contactPerson", "contact_person"]),
      phone: pickText(payload, ["phone"]),
      email: pickText(payload, ["email"]),
      pan_number: pickText(payload, ["panNumber", "pan_number"]),
      gst_number: pickText(payload, ["gstNumber", "gst_number"]),
      address_line: pickText(payload, ["addressLine", "address_line", "address"]),
      country: pickText(payload, ["country"]),
      invoice_beneficiary_name: pickText(payload, [
        "invoiceBeneficiaryName",
        "invoice_beneficiary_name",
      ]),
      invoice_bank_name: pickText(payload, ["invoiceBankName", "invoice_bank_name"]),
      invoice_account_number: pickText(payload, [
        "invoiceAccountNumber",
        "invoice_account_number",
      ]),
      invoice_ifsc_swift: pickText(payload, [
        "invoiceIfscSwift",
        "invoice_ifsc_swift",
      ]),
      invoice_upi_id: pickText(payload, ["invoiceUpiId", "invoice_upi_id"]),
      bank_name: pickText(payload, ["bankName", "bank_name"]),
      bank_account_number: pickText(payload, [
        "bankAccountNumber",
        "bank_account_number",
      ]),
      ifsc_code: pickText(payload, ["ifscCode", "ifsc_code"]),
      supplier_currency: pickText(payload, [
        "supplierCurrency",
        "supplier_currency",
        "currency",
      ]),
      contract_url: pickText(payload, ["contractUrl", "contract_url"]),
      rate_valid_until: pickDate(payload, ["rateValidUntil", "rate_valid_until"]),
      production_commitment: pickText(payload, [
        "productionCommitment",
        "production_commitment",
      ]),
      payment_deadline_date: pickDate(payload, [
        "paymentDeadlineDate",
        "payment_deadline_date",
      ]),
      is_active: pickBoolean(payload, ["isActive", "is_active"]),
    };
  }

  function derivePayableStatus(payableAmount, paidAmount, providedStatus) {
    if (providedStatus) {
      return String(providedStatus).trim().toUpperCase();
    }

    if (paidAmount <= 0) {
      return "PENDING";
    }
    if (paidAmount >= payableAmount) {
      return "PAID";
    }
    return "PARTIAL";
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "suppliers", requestId: context.requestId, id },
      "Get supplier by id",
    );
    const item = await repository.findById(id);
    if (!item || item.is_deleted) {
      throw new AppError(404, "Supplier not found", "SUPPLIER_NOT_FOUND");
    }
    return toSupplier(item);
  }

  return Object.freeze({
    async list(filters = {}, context = {}) {
      logger.debug(
        { module: "suppliers", requestId: context.requestId, filters },
        "List suppliers",
      );
      const rows = await repository.findAll(mapListFilters(filters));
      return rows.filter((row) => !row.is_deleted).map(toSupplier);
    },

    getById,

    async create(payload) {
      const mappedPayload = mapCreatePayload(payload);
      if (!mappedPayload.name) {
        throw new AppError(
          400,
          "Supplier name is required",
          "SUPPLIER_NAME_REQUIRED",
        );
      }
      const created = await repository.create(mappedPayload);
      const supplier = toSupplier(created);
      events.emitCreated(supplier);
      return supplier;
    },

    async update(id, payload, context = {}) {
      await getById(id, context);
      const updated = await repository.update(id, mapUpdatePayload(payload));
      const supplier = toSupplier(updated);
      events.emitUpdated(supplier);
      return supplier;
    },

    async listPayables(supplierId, filters = {}, context = {}) {
      await getById(supplierId, context);
      const rows = await repository.findPayablesBySupplierId(supplierId, {
        status: filters.status,
        bookingId: filters.bookingId,
        page: filters.page,
        limit: filters.limit,
      });
      return rows.map(toPayable);
    },

    async createPayable(supplierId, payload, context = {}) {
      await getById(supplierId, context);
      const booking = await repository.findBookingById(payload.bookingId);
      if (!booking) {
        throw new AppError(
          404,
          "Booking not found",
          "SUPPLIER_PAYABLE_BOOKING_NOT_FOUND",
        );
      }

      const payableAmount = Number(payload.payableAmount);
      const paidAmount = Number(payload.paidAmount || 0);

      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new AppError(
          400,
          "payableAmount must be greater than 0",
          "SUPPLIER_PAYABLE_INVALID_AMOUNT",
        );
      }
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        throw new AppError(
          400,
          "paidAmount cannot be negative",
          "SUPPLIER_PAYABLE_INVALID_PAID_AMOUNT",
        );
      }
      if (paidAmount > payableAmount) {
        throw new AppError(
          400,
          "paidAmount cannot exceed payableAmount",
          "SUPPLIER_PAYABLE_INVALID_PAID_AMOUNT",
        );
      }

      const existing = await repository.findPayableBySupplierAndBooking(
        supplierId,
        payload.bookingId,
      );

      if (existing) {
        const currentPayableAmount = Number(existing.payable_amount || 0);
        const currentPaidAmount = Number(existing.paid_amount || 0);
        const nextPayableAmount = payableAmount;
        const nextPaidAmount =
          payload.paidAmount !== undefined ? paidAmount : currentPaidAmount;

        if (nextPaidAmount > nextPayableAmount) {
          throw new AppError(
            400,
            "paidAmount cannot exceed payableAmount",
            "SUPPLIER_PAYABLE_INVALID_PAID_AMOUNT",
          );
        }

        const hasChanges =
          Number(nextPayableAmount) !== Number(currentPayableAmount) ||
          Number(nextPaidAmount) !== Number(currentPaidAmount) ||
          payload.dueDate !== undefined ||
          payload.status !== undefined ||
          payload.paymentReference !== undefined;

        if (!hasChanges) {
          return toPayable(existing);
        }

        const updated = await repository.updatePayable(existing.id, {
          payable_amount: nextPayableAmount,
          paid_amount: nextPaidAmount,
          due_date: payload.dueDate,
          status: derivePayableStatus(
            nextPayableAmount,
            nextPaidAmount,
            payload.status,
          ),
          payment_reference: payload.paymentReference,
          last_paid_at:
            payload.paidAmount !== undefined
              ? new Date().toISOString()
              : existing.last_paid_at,
        });

        const payable = toPayable(updated);
        events.emitPayableUpdated(payable);
        return payable;
      }

      const created = await repository.createPayable({
        booking_id: payload.bookingId,
        supplier_id: supplierId,
        payable_amount: payableAmount,
        paid_amount: paidAmount,
        due_date: payload.dueDate || null,
        status: derivePayableStatus(payableAmount, paidAmount, payload.status),
        payment_reference: payload.paymentReference || null,
        last_paid_at: paidAmount > 0 ? new Date().toISOString() : null,
      });

      const payable = toPayable(created);
      events.emitPayableCreated(payable);
      return payable;
    },

    async updatePayable(payableId, payload, context = {}) {
      const existing = await repository.findPayableById(payableId);
      if (!existing) {
        throw new AppError(
          404,
          "Supplier payable not found",
          "SUPPLIER_PAYABLE_NOT_FOUND",
        );
      }

      await getById(existing.supplier_id, context);

      const payableAmount =
        payload.payableAmount !== undefined
          ? Number(payload.payableAmount)
          : Number(existing.payable_amount);
      const paidAmount =
        payload.paidAmount !== undefined
          ? Number(payload.paidAmount)
          : Number(existing.paid_amount || 0);

      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        throw new AppError(
          400,
          "payableAmount must be greater than 0",
          "SUPPLIER_PAYABLE_INVALID_AMOUNT",
        );
      }
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        throw new AppError(
          400,
          "paidAmount cannot be negative",
          "SUPPLIER_PAYABLE_INVALID_PAID_AMOUNT",
        );
      }
      if (paidAmount > payableAmount) {
        throw new AppError(
          400,
          "paidAmount cannot exceed payableAmount",
          "SUPPLIER_PAYABLE_INVALID_PAID_AMOUNT",
        );
      }

      const updated = await repository.updatePayable(payableId, {
        payable_amount: payload.payableAmount,
        paid_amount: payload.paidAmount,
        due_date: payload.dueDate,
        status: derivePayableStatus(payableAmount, paidAmount, payload.status),
        payment_reference: payload.paymentReference,
        last_paid_at:
          payload.paidAmount !== undefined
            ? new Date().toISOString()
            : existing.last_paid_at,
      });

      const payable = toPayable(updated);
      events.emitPayableUpdated(payable);
      return payable;
    },

    async settlePayable(payableId, payload, context = {}) {
      const existing = await repository.findPayableById(payableId);
      if (!existing) {
        throw new AppError(
          404,
          "Supplier payable not found",
          "SUPPLIER_PAYABLE_NOT_FOUND",
        );
      }

      await getById(existing.supplier_id, context);

      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(
          400,
          "Settlement amount must be greater than 0",
          "SUPPLIER_PAYABLE_INVALID_SETTLEMENT_AMOUNT",
        );
      }

      try {
        const result = await repository.applySettlement({
          payableId,
          settlementAmount: amount,
          paymentMode: payload.paymentMode || "BANK_TRANSFER",
          settlementDate: payload.settlementDate || new Date().toISOString(),
          reference: payload.reference || null,
          notes: payload.notes || null,
          createdBy: context.user?.id || null,
        });

        const payable = toPayable(result?.payable);
        if (!payable) {
          throw new AppError(
            500,
            "Unable to settle payable",
            "SUPPLIER_PAYABLE_SETTLEMENT_FAILED",
          );
        }
        const settlement = toSettlement(result?.settlement);

        events.emitPayableUpdated(payable);
        events.emitPayableSettled({ payable, settlement });

        return { payable, settlement };
      } catch (error) {
        if (error.code === "SUPPLIER_PAYABLE_NOT_FOUND") {
          throw new AppError(
            404,
            "Supplier payable not found",
            "SUPPLIER_PAYABLE_NOT_FOUND",
          );
        }
        if (
          error.code === "SUPPLIER_PAYABLE_INVALID_SETTLEMENT_AMOUNT" ||
          error.code === "SUPPLIER_PAYABLE_SETTLEMENT_EXCEEDS_PENDING"
        ) {
          throw new AppError(
            400,
            error.message || "Settlement amount is invalid",
            error.code,
          );
        }
        throw error;
      }
    },

    async listPayableSettlements(payableId, filters = {}, context = {}) {
      const payable = await repository.findPayableById(payableId);
      if (!payable) {
        throw new AppError(
          404,
          "Supplier payable not found",
          "SUPPLIER_PAYABLE_NOT_FOUND",
        );
      }
      await getById(payable.supplier_id, context);

      const result = await repository.findSettlementsByPayableId(
        payableId,
        filters,
      );
      return {
        rows: (result.rows || []).map(toSettlement),
        pagination: result.pagination,
      };
    },

    async listSupplierSettlements(supplierId, filters = {}, context = {}) {
      await getById(supplierId, context);

      const result = await repository.findSettlementsBySupplierId(
        supplierId,
        filters,
      );
      return {
        rows: (result.rows || []).map(toSettlement),
        pagination: result.pagination,
      };
    },

    async listSupplierBookings(supplierId, filters = {}, context = {}) {
      await getById(supplierId, context);
      const rows = await repository.findBookingsBySupplierId(supplierId, filters);
      return rows.map((row) => ({
        id: row.id,
        bookingId: row.booking_id ?? row.bookingId,
        bookingNumber: row.booking_number ?? row.bookingNumber,
        customer: row.customer_full_name ?? row.customer_name ?? row.customerName ?? 'Unknown Customer',
        customerEmail: row.customer_email ?? row.customerEmail,
        customerPhone: row.customer_phone ?? row.customerPhone,
        destination: row.destination_name ?? row.destinationName ?? row.quotation_destination ?? row.quotationDestination ?? 'N/A',
        totalAmount: toNumber(row.total_sale_value ?? row.totalSaleValue ?? row.total_amount ?? row.totalAmount, 0),
        currency: row.client_currency ?? row.clientCurrency ?? 'INR',
        serviceName: normalizeServiceNames(
          row.service_names ??
            row.serviceName ??
            row.service_name ??
            row.serviceType ??
            row.service_type ??
            row.itemType ??
            row.item_type,
        ),
        status: row.status,
        travelStartDate: row.travel_start_date ?? row.travelStartDate,
        createdAt: row.created_at ?? row.createdAt,
      }));
    },

    async processPayableDeadlineAlerts(payload = {}, context = {}) {
      const lookaheadDaysRaw = Number(payload.lookaheadDays ?? 2);
      const lookaheadDays =
        Number.isFinite(lookaheadDaysRaw) && lookaheadDaysRaw > 0
          ? Math.min(Math.floor(lookaheadDaysRaw), 60)
          : 2;
      const limitRaw = Number(payload.limit ?? 200);
      const limit =
        Number.isFinite(limitRaw) && limitRaw > 0
          ? Math.min(Math.floor(limitRaw), 1000)
          : 200;
      const referenceDate = payload.referenceDate
        ? new Date(payload.referenceDate)
        : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        throw new AppError(
          400,
          "referenceDate is invalid",
          "SUPPLIER_INVALID_REFERENCE_DATE",
        );
      }

      const candidates = await repository.findPayableDeadlineCandidates({
        limit,
      });
      const alertDate = toDateOnly(referenceDate);
      const summary = {
        processed: candidates.length,
        triggered: 0,
        skipped: 0,
        alerts: [],
      };

      for (const row of candidates) {
        const payable = toPayable(row);
        const dueDate = payable.dueDate ? new Date(payable.dueDate) : null;
        if (!dueDate || Number.isNaN(dueDate.getTime())) {
          summary.skipped += 1;
          continue;
        }

        const diffDays = Math.ceil(
          (dueDate.getTime() - referenceDate.getTime()) /
            (24 * 60 * 60 * 1000),
        );
        let alertType = null;
        if (diffDays < 0) {
          alertType = "PAYABLE_OVERDUE";
        } else if (diffDays <= lookaheadDays) {
          alertType = "PAYABLE_DUE_SOON";
        }

        if (!alertType) {
          summary.skipped += 1;
          continue;
        }

        const normalizedAlertType = normalizeAlertType(alertType);
        const existing = await repository.findPayableAlertLog({
          payableId: payable.id,
          alertType: normalizedAlertType,
          alertDate,
        });
        if (existing) {
          summary.skipped += 1;
          continue;
        }

        await repository.createPayableAlertLog({
          payableId: payable.id,
          alertType: normalizedAlertType,
          alertDate,
          metadata: {
            supplierId: payable.supplierId,
            supplierName: payable.supplierName,
            dueDate: payable.dueDate,
            dueInDays: diffDays,
            payableAmount: payable.payableAmount,
            paidAmount: payable.paidAmount,
            pendingAmount: payable.pendingAmount,
          },
        });

        const eventPayload = {
          payableId: payable.id,
          supplierId: payable.supplierId,
          supplierName: payable.supplierName,
          bookingId: payable.bookingId,
          alertType: normalizedAlertType,
          alertDate,
          dueDate: payable.dueDate,
          dueInDays: diffDays,
          payableAmount: payable.payableAmount,
          paidAmount: payable.paidAmount,
          pendingAmount: payable.pendingAmount,
          triggeredBy: context.user?.id || null,
        };
        events.emitPayableDeadlineAlert(eventPayload);
        summary.alerts.push(eventPayload);
        summary.triggered += 1;
      }

      return summary;
    },
  });
}

export { createSuppliersService };
