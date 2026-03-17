const { AppError } = require("../../core/errors");

function toSupplier(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    name: entity.name,
    contactPerson: entity.contact_person,
    phone: entity.phone,
    email: entity.email,
    panNumber: entity.pan_number,
    gstNumber: entity.gst_number,
    address: entity.address,
    addressLine: entity.address_line,
    country: entity.country,
    invoiceBeneficiaryName: entity.invoice_beneficiary_name,
    invoiceBankName: entity.invoice_bank_name,
    invoiceAccountNumber: entity.invoice_account_number,
    invoiceIfscSwift: entity.invoice_ifsc_swift,
    invoiceUpiId: entity.invoice_upi_id,
    bankName: entity.bank_name,
    bankAccountNumber: entity.bank_account_number,
    ifscCode: entity.ifsc_code,
    supplierCurrency: entity.supplier_currency,
    contractUrl: entity.contract_url,
    rateValidUntil: entity.rate_valid_until,
    productionCommitment: entity.production_commitment,
    paymentDeadlineDate: entity.payment_deadline_date,
    isActive: entity.is_active,
    isDeleted: entity.is_deleted,
    createdAt: entity.created_at,
  };
}

function toPayable(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    bookingId: entity.booking_id,
    supplierId: entity.supplier_id,
    payableAmount: entity.payable_amount,
    paidAmount: entity.paid_amount,
    dueDate: entity.due_date,
    status: entity.status,
    paymentReference: entity.payment_reference,
    lastPaidAt: entity.last_paid_at,
    createdAt: entity.created_at,
  };
}

function createSuppliersService({ repository, logger, events }) {
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
      name: payload.name,
      contact_person: payload.contactPerson,
      phone: payload.phone,
      email: payload.email,
      pan_number: payload.panNumber,
      gst_number: payload.gstNumber,
      address: payload.address,
      address_line: payload.addressLine,
      country: payload.country,
      invoice_beneficiary_name: payload.invoiceBeneficiaryName,
      invoice_bank_name: payload.invoiceBankName,
      invoice_account_number: payload.invoiceAccountNumber,
      invoice_ifsc_swift: payload.invoiceIfscSwift,
      invoice_upi_id: payload.invoiceUpiId,
      bank_name: payload.bankName,
      bank_account_number: payload.bankAccountNumber,
      ifsc_code: payload.ifscCode,
      supplier_currency: payload.supplierCurrency,
      contract_url: payload.contractUrl,
      rate_valid_until: payload.rateValidUntil,
      production_commitment: payload.productionCommitment,
      payment_deadline_date: payload.paymentDeadlineDate,
      is_active: payload.isActive,
      is_deleted: false,
    };
  }

  function mapUpdatePayload(payload) {
    return {
      name: payload.name,
      contact_person: payload.contactPerson,
      phone: payload.phone,
      email: payload.email,
      pan_number: payload.panNumber,
      gst_number: payload.gstNumber,
      address: payload.address,
      address_line: payload.addressLine,
      country: payload.country,
      invoice_beneficiary_name: payload.invoiceBeneficiaryName,
      invoice_bank_name: payload.invoiceBankName,
      invoice_account_number: payload.invoiceAccountNumber,
      invoice_ifsc_swift: payload.invoiceIfscSwift,
      invoice_upi_id: payload.invoiceUpiId,
      bank_name: payload.bankName,
      bank_account_number: payload.bankAccountNumber,
      ifsc_code: payload.ifscCode,
      supplier_currency: payload.supplierCurrency,
      contract_url: payload.contractUrl,
      rate_valid_until: payload.rateValidUntil,
      production_commitment: payload.productionCommitment,
      payment_deadline_date: payload.paymentDeadlineDate,
      is_active: payload.isActive,
      is_deleted: payload.isDeleted,
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

    async create(payload, context = {}) {
      const created = await repository.create(mapCreatePayload(payload));
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
  });
}

module.exports = { createSuppliersService };
