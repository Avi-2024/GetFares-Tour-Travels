const { AppError } = require('../../core/errors');

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
  REFUNDED: 'REFUNDED',
});

const PAYMENT_MODE_ALIASES = Object.freeze({
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYMENT_GATEWAY: 'PAYMENT_GATEWAY',
  BANK: 'BANK_TRANSFER',
  UPI: 'PAYMENT_GATEWAY',
  CARD: 'PAYMENT_GATEWAY',
  GATEWAY: 'PAYMENT_GATEWAY',
});

function createPaymentsService({ repository, logger, events }) {
  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeCurrency(value) {
    if (!value) {
      return 'INR';
    }
    return String(value).trim().toUpperCase();
  }

  function normalizePaymentMode(value) {
    const normalized = String(value || '').trim().toUpperCase();
    const mapped = PAYMENT_MODE_ALIASES[normalized];

    if (!mapped) {
      throw new AppError(400, `Unsupported payment mode: ${value}`, 'PAYMENT_INVALID_MODE');
    }

    return mapped;
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

  async function getById(id, context = {}) {
    logger.debug({ module: 'payments', requestId: context.requestId, id }, 'Getting payment by id');
    const payment = await repository.findById(id);

    if (!payment) {
      throw new AppError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  async function getBookingById(bookingId) {
    const booking = await repository.findBookingById(bookingId);
    if (!booking || booking.isDeleted) {
      throw new AppError(404, 'Booking not found', 'PAYMENT_BOOKING_NOT_FOUND');
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError(409, 'Payments are blocked for cancelled bookings.', 'PAYMENT_BOOKING_CANCELLED');
    }

    return booking;
  }

  async function syncBookingPaymentSummary(bookingId) {
    const booking = await repository.findBookingById(bookingId);
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

    return repository.updateBooking(bookingId, {
      advance_received: netReceived,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    });
  }

  function buildCreateRecord(payload, context = {}) {
    const isVerified = payload.isVerified === true;
    const nowIso = new Date().toISOString();

    return {
      booking_id: payload.bookingId,
      amount: toNumber(payload.amount, 0),
      currency: normalizeCurrency(payload.currency),
      payment_mode: normalizePaymentMode(payload.paymentMode),
      gateway_provider: payload.gatewayProvider || null,
      gateway_order_id: payload.gatewayOrderId || null,
      gateway_payment_id: payload.gatewayPaymentId || null,
      gateway_signature: payload.gatewaySignature || null,
      payment_reference: payload.paymentReference || null,
      proof_url: payload.proofUrl || null,
      status: payload.status || PAYMENT_STATUS.PENDING,
      is_verified: isVerified,
      verified_by: isVerified ? context.user?.id || null : null,
      verified_at: isVerified ? nowIso : null,
      paid_at: payload.paidAt || (isVerified ? nowIso : null),
      updated_at: nowIso,
    };
  }

  return Object.freeze({
    PAYMENT_STATUS,
    syncBookingPaymentSummary,

    async list(filters = {}, context = {}) {
      logger.debug({ module: 'payments', requestId: context.requestId, filters }, 'Listing payments');
      return repository.findAll(filters);
    },

    getById,

    async create(payload, context = {}) {
      await getBookingById(payload.bookingId);

      const record = buildCreateRecord(payload, context);
      const created = await repository.create(record);
      const booking = await syncBookingPaymentSummary(payload.bookingId);

      events.emitCreated({
        ...created,
        bookingId: payload.bookingId,
        bookingPaymentStatus: booking?.paymentStatus || null,
      });

      return {
        ...created,
        bookingPaymentStatus: booking?.paymentStatus || null,
        bookingAdvanceReceived: booking?.advanceReceived ?? null,
      };
    },

    async update(id, payload, context = {}) {
      const existing = await getById(id, context);
      await getBookingById(existing.bookingId);

      const patch = {};

      if (payload.amount !== undefined) {
        patch.amount = toNumber(payload.amount, existing.amount);
      }
      if (payload.currency !== undefined) {
        patch.currency = normalizeCurrency(payload.currency);
      }
      if (payload.paymentMode !== undefined) {
        patch.payment_mode = normalizePaymentMode(payload.paymentMode);
      }
      if (payload.gatewayProvider !== undefined) {
        patch.gateway_provider = payload.gatewayProvider || null;
      }
      if (payload.gatewayOrderId !== undefined) {
        patch.gateway_order_id = payload.gatewayOrderId || null;
      }
      if (payload.gatewayPaymentId !== undefined) {
        patch.gateway_payment_id = payload.gatewayPaymentId || null;
      }
      if (payload.gatewaySignature !== undefined) {
        patch.gateway_signature = payload.gatewaySignature || null;
      }
      if (payload.paymentReference !== undefined) {
        patch.payment_reference = payload.paymentReference || null;
      }
      if (payload.proofUrl !== undefined) {
        patch.proof_url = payload.proofUrl || null;
      }
      if (payload.status !== undefined) {
        patch.status = payload.status;
      }
      if (payload.paidAt !== undefined) {
        patch.paid_at = toIsoDate(payload.paidAt);
      }
      if (payload.isVerified !== undefined) {
        patch.is_verified = payload.isVerified;
        patch.verified_by = payload.isVerified ? context.user?.id || existing.verifiedBy || null : null;
        patch.verified_at = payload.isVerified ? new Date().toISOString() : null;
      }

      patch.updated_at = new Date().toISOString();

      const updated = await repository.update(id, patch);
      const booking = await syncBookingPaymentSummary(updated.bookingId);
      events.emitUpdated(updated);

      return {
        ...updated,
        bookingPaymentStatus: booking?.paymentStatus || null,
        bookingAdvanceReceived: booking?.advanceReceived ?? null,
      };
    },

    async verify(id, payload = {}, context = {}) {
      const existing = await getById(id, context);
      await getBookingById(existing.bookingId);

      const nowIso = new Date().toISOString();
      const patch = {
        is_verified: true,
        verified_by: context.user?.id || existing.verifiedBy || null,
        verified_at: nowIso,
        paid_at: payload.paidAt || existing.paidAt || nowIso,
        status: payload.status || (existing.status === PAYMENT_STATUS.PENDING ? PAYMENT_STATUS.FULL : existing.status),
        updated_at: nowIso,
      };

      if (payload.proofUrl !== undefined) {
        patch.proof_url = payload.proofUrl || null;
      }
      if (payload.paymentReference !== undefined) {
        patch.payment_reference = payload.paymentReference || null;
      }
      if (payload.gatewayPaymentId !== undefined) {
        patch.gateway_payment_id = payload.gatewayPaymentId || null;
      }

      const updated = await repository.update(id, patch);
      const booking = await syncBookingPaymentSummary(updated.bookingId);

      events.emitVerified({
        id: updated.id,
        bookingId: updated.bookingId,
        verifiedBy: patch.verified_by,
      });
      events.emitUpdated(updated);

      return {
        ...updated,
        bookingPaymentStatus: booking?.paymentStatus || null,
        bookingAdvanceReceived: booking?.advanceReceived ?? null,
      };
    },
  });
}

module.exports = { createPaymentsService, PAYMENT_STATUS };
