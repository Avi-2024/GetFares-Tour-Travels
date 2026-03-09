const { AppError } = require('../../core/errors');

const BOOKING_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
  REFUNDED: 'REFUNDED',
});

const PAYMENT_POLICY = Object.freeze({
  refundableAdvanceRatio: 0.5,
});

function createBookingsService({ repository, logger, events }) {
  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toUpperText(value) {
    if (!value) {
      return null;
    }
    return String(value).trim().toUpperCase();
  }

  function toIsoDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  function toDateString(value) {
    const iso = toIsoDate(value);
    return iso ? iso.slice(0, 10) : null;
  }

  function buildBookingNumber() {
    const ts = Date.now();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `BK-${ts}-${randomPart}`;
  }

  function buildInvoiceNumber(bookingNumber) {
    const ts = Date.now();
    const prefix = bookingNumber || `BK${String(ts).slice(-6)}`;
    return `INV-${prefix}-${String(ts).slice(-5)}`;
  }

  function minimumAdvanceRequired(totalAmount, isNonRefundable) {
    if (isNonRefundable) {
      return totalAmount;
    }

    return Number((totalAmount * PAYMENT_POLICY.refundableAdvanceRatio).toFixed(2));
  }

  async function getById(id, context = {}) {
    logger.debug({ module: 'bookings', requestId: context.requestId, id }, 'Getting booking by id');

    const booking = await repository.findById(id);
    if (!booking || booking.isDeleted) {
      throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
    }

    return booking;
  }

  async function ensureQuotationExists(quotationId) {
    const quotation = await repository.findQuotationById(quotationId);
    if (!quotation) {
      throw new AppError(404, 'Quotation not found', 'BOOKING_QUOTATION_NOT_FOUND');
    }

    return quotation;
  }

  async function ensureBookingNumberUnique(bookingNumber, exceptId = null) {
    if (!bookingNumber) {
      return;
    }

    const existing = await repository.findByBookingNumber(bookingNumber);
    if (existing && existing.id !== exceptId) {
      throw new AppError(409, 'Booking number already exists', 'BOOKING_NUMBER_EXISTS');
    }
  }

  async function appendStatusHistory({ bookingId, oldStatus, newStatus, changedBy, changedAt }) {
    await repository.createStatusHistory({
      bookingId,
      oldStatus: oldStatus || null,
      newStatus,
      changedBy: changedBy || null,
      changedAt: changedAt || new Date().toISOString(),
    });
  }

  async function assertPaymentPolicyForConfirmation(booking) {
    const snapshot = await repository.getPaymentPolicySnapshot(booking.id, booking.advanceRequired);

    if (!snapshot.meetsAdvance) {
      throw new AppError(
        409,
        `Advance payment requirement not met. Required ${booking.advanceRequired}, received ${snapshot.paidAmount}.`,
        'BOOKING_ADVANCE_NOT_MET',
      );
    }

    if (!snapshot.hasProof) {
      throw new AppError(409, 'No verified payment proof found for confirmation.', 'BOOKING_PAYMENT_PROOF_REQUIRED');
    }

    return snapshot;
  }

  async function recalculatePaymentStatus(bookingId) {
    const booking = await repository.findById(bookingId);
    if (!booking) {
      return null;
    }

    const [paidAmount, refundedAmount] = await Promise.all([
      repository.getVerifiedPaidAmount(bookingId),
      repository.getProcessedRefundAmount(bookingId),
    ]);

    const netReceived = Math.max(Number((paidAmount - refundedAmount).toFixed(2)), 0);
    const totalAmount = toNumber(booking.totalAmount, 0);

    let paymentStatus = PAYMENT_STATUS.PENDING;
    if (refundedAmount > 0 && netReceived === 0) {
      paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (netReceived > 0 && netReceived < totalAmount) {
      paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else if (netReceived >= totalAmount && totalAmount > 0) {
      paymentStatus = PAYMENT_STATUS.FULL;
    }

    return repository.update(bookingId, {
      advance_received: netReceived,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    });
  }

  async function transitionStatus(id, payload, context = {}) {
    const existing = await getById(id, context);
    const nextStatus = toUpperText(payload.status);
    if (!nextStatus || !BOOKING_STATUS[nextStatus]) {
      throw new AppError(400, 'Invalid booking status transition request', 'BOOKING_INVALID_STATUS');
    }

    if (existing.status === nextStatus) {
      return existing;
    }

    if (existing.status === BOOKING_STATUS.CANCELLED && nextStatus !== BOOKING_STATUS.CANCELLED) {
      throw new AppError(409, 'Cancelled booking cannot transition to another status.', 'BOOKING_STATUS_LOCKED');
    }

    const changedAt = payload.changedAt || new Date().toISOString();
    const updatePayload = {};

    if (nextStatus === BOOKING_STATUS.CONFIRMED) {
      await assertPaymentPolicyForConfirmation(existing);

      updatePayload.status = BOOKING_STATUS.CONFIRMED;
      updatePayload.cancellation_reason = null;
      updatePayload.cancelled_at = null;
    } else if (nextStatus === BOOKING_STATUS.CANCELLED) {
      if (!payload.cancellationReason) {
        throw new AppError(400, 'cancellationReason is required when status is CANCELLED', 'BOOKING_CANCEL_REASON_REQUIRED');
      }

      updatePayload.status = BOOKING_STATUS.CANCELLED;
      updatePayload.cancellation_reason = payload.cancellationReason;
      updatePayload.cancelled_at = changedAt;
    } else {
      updatePayload.status = BOOKING_STATUS.PENDING;
    }

    updatePayload.updated_at = changedAt;

    const updated = await repository.update(existing.id, updatePayload);
    await appendStatusHistory({
      bookingId: existing.id,
      oldStatus: existing.status,
      newStatus: updated.status,
      changedBy: context.user?.id || null,
      changedAt,
    });

    events.emitStatusChanged({
      id: updated.id,
      oldStatus: existing.status,
      newStatus: updated.status,
      changedBy: context.user?.id || null,
    });
    events.emitUpdated(updated);

    return updated;
  }

  function buildCreateRecord(payload, context = {}) {
    const totalAmount = toNumber(payload.totalAmount, 0);
    const costAmount = toNumber(payload.costAmount, 0);
    const nonRefundable = Boolean(payload.isNonRefundable);
    const minimumAdvance = minimumAdvanceRequired(totalAmount, nonRefundable);
    const requestedAdvance = payload.advanceRequired !== undefined ? toNumber(payload.advanceRequired, 0) : minimumAdvance;

    if (costAmount > totalAmount) {
      throw new AppError(400, 'costAmount cannot be greater than totalAmount', 'BOOKING_COST_EXCEEDS_TOTAL');
    }

    if (requestedAdvance < minimumAdvance) {
      throw new AppError(
        409,
        `Advance requirement violation. Minimum required is ${minimumAdvance}.`,
        'BOOKING_ADVANCE_POLICY_VIOLATION',
      );
    }

    if (requestedAdvance > totalAmount) {
      throw new AppError(400, 'advanceRequired cannot exceed totalAmount', 'BOOKING_ADVANCE_EXCEEDS_TOTAL');
    }

    return {
      quotation_id: payload.quotationId,
      booking_number: payload.bookingNumber || buildBookingNumber(),
      travel_start_date: toDateString(payload.travelStartDate),
      travel_end_date: toDateString(payload.travelEndDate),
      total_amount: totalAmount,
      cost_amount: costAmount,
      status: BOOKING_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.PENDING,
      advance_required: requestedAdvance,
      advance_received: 0,
      client_currency: payload.clientCurrency ? toUpperText(payload.clientCurrency) : 'INR',
      supplier_currency: payload.supplierCurrency ? toUpperText(payload.supplierCurrency) : 'INR',
      exchange_rate: payload.exchangeRate !== undefined ? toNumber(payload.exchangeRate, null) : null,
      exchange_locked: payload.exchangeLocked ?? false,
      created_by: context.user?.id || null,
      updated_at: new Date().toISOString(),
    };
  }

  return Object.freeze({
    BOOKING_STATUS,
    PAYMENT_STATUS,
    recalculatePaymentStatus,

    async list(filters = {}, context = {}) {
      logger.debug({ module: 'bookings', requestId: context.requestId, filters }, 'Listing bookings');
      return repository.findAll(filters);
    },

    getById,

    async create(payload, context = {}) {
      await ensureQuotationExists(payload.quotationId);

      const existingForQuotation = await repository.findByQuotationId(payload.quotationId);
      if (existingForQuotation && !existingForQuotation.isDeleted) {
        throw new AppError(409, 'A booking already exists for this quotation.', 'BOOKING_ALREADY_EXISTS_FOR_QUOTATION');
      }

      const record = buildCreateRecord(payload, context);
      await ensureBookingNumberUnique(record.booking_number);

      const created = await repository.create(record);

      await appendStatusHistory({
        bookingId: created.id,
        oldStatus: null,
        newStatus: created.status,
        changedBy: context.user?.id || null,
      });

      events.emitCreated(created);
      return created;
    },

    async update(id, payload, context = {}) {
      const existing = await getById(id, context);

      if (payload.status) {
        return transitionStatus(id, payload, context);
      }

      const updatePayload = {};

      if (payload.travelStartDate !== undefined) {
        updatePayload.travel_start_date = toDateString(payload.travelStartDate);
      }
      if (payload.travelEndDate !== undefined) {
        updatePayload.travel_end_date = toDateString(payload.travelEndDate);
      }
      if (payload.totalAmount !== undefined) {
        updatePayload.total_amount = toNumber(payload.totalAmount, existing.totalAmount);
      }
      if (payload.costAmount !== undefined) {
        updatePayload.cost_amount = toNumber(payload.costAmount, existing.costAmount);
      }
      if (payload.advanceRequired !== undefined) {
        updatePayload.advance_required = toNumber(payload.advanceRequired, existing.advanceRequired);
      }
      if (payload.paymentStatus !== undefined) {
        updatePayload.payment_status = payload.paymentStatus;
      }
      if (payload.clientCurrency !== undefined) {
        updatePayload.client_currency = toUpperText(payload.clientCurrency);
      }
      if (payload.supplierCurrency !== undefined) {
        updatePayload.supplier_currency = toUpperText(payload.supplierCurrency);
      }
      if (payload.exchangeRate !== undefined) {
        updatePayload.exchange_rate = toNumber(payload.exchangeRate, null);
      }
      if (payload.exchangeLocked !== undefined) {
        updatePayload.exchange_locked = payload.exchangeLocked;
      }
      if (payload.cancellationReason !== undefined) {
        updatePayload.cancellation_reason = payload.cancellationReason;
      }

      if (
        (updatePayload.travel_start_date || existing.travelStartDate) &&
        (updatePayload.travel_end_date || existing.travelEndDate)
      ) {
        const startDate = updatePayload.travel_start_date || existing.travelStartDate;
        const endDate = updatePayload.travel_end_date || existing.travelEndDate;
        if (endDate < startDate) {
          throw new AppError(400, 'travelEndDate must be on or after travelStartDate', 'BOOKING_INVALID_TRAVEL_DATES');
        }
      }

      const nextTotalAmount = updatePayload.total_amount ?? existing.totalAmount;
      const nextCostAmount = updatePayload.cost_amount ?? existing.costAmount;
      if (toNumber(nextCostAmount, 0) > toNumber(nextTotalAmount, 0)) {
        throw new AppError(400, 'costAmount cannot be greater than totalAmount', 'BOOKING_COST_EXCEEDS_TOTAL');
      }

      if (updatePayload.advance_required !== undefined && toNumber(updatePayload.advance_required, 0) > toNumber(nextTotalAmount, 0)) {
        throw new AppError(400, 'advanceRequired cannot exceed totalAmount', 'BOOKING_ADVANCE_EXCEEDS_TOTAL');
      }

      const minimumAdvance = minimumAdvanceRequired(toNumber(nextTotalAmount, 0), false);
      const nextAdvanceRequired = updatePayload.advance_required ?? existing.advanceRequired;
      if (toNumber(nextAdvanceRequired, 0) < minimumAdvance) {
        throw new AppError(
          409,
          `Advance requirement violation. Minimum required is ${minimumAdvance}.`,
          'BOOKING_ADVANCE_POLICY_VIOLATION',
        );
      }

      updatePayload.updated_at = new Date().toISOString();

      const updated = await repository.update(id, updatePayload);
      events.emitUpdated(updated);
      return updated;
    },

    transitionStatus,

    async listStatusHistory(id, context = {}) {
      await getById(id, context);
      return repository.listStatusHistory(id);
    },

    async generateInvoice(id, payload = {}, context = {}) {
      const booking = await getById(id, context);

      let invoiceNumber = payload.invoiceNumber || buildInvoiceNumber(booking.bookingNumber);
      let invoice = await repository.findInvoiceByNumber(invoiceNumber);

      if (invoice) {
        invoiceNumber = buildInvoiceNumber(`${booking.bookingNumber || 'BK'}R`);
        invoice = await repository.findInvoiceByNumber(invoiceNumber);
        if (invoice) {
          throw new AppError(409, 'Unable to generate unique invoice number', 'BOOKING_INVOICE_NUMBER_EXISTS');
        }
      }

      const created = await repository.createInvoice({
        bookingId: booking.id,
        invoiceNumber,
        pdfUrl: payload.pdfUrl || null,
        generatedAt: new Date().toISOString(),
      });

      events.emitInvoiceGenerated({
        bookingId: booking.id,
        invoiceId: created.id,
        invoiceNumber: created.invoiceNumber,
      });

      return created;
    },

    async listInvoices(id, context = {}) {
      await getById(id, context);
      return repository.findInvoicesByBookingId(id);
    },
  });
}

module.exports = { createBookingsService, BOOKING_STATUS, PAYMENT_STATUS };
