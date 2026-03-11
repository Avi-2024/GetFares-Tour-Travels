const { AppError } = require('../../core/errors');

const REFUND_STATUS = Object.freeze({
  INITIATED: 'INITIATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PROCESSED: 'PROCESSED',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
  REFUNDED: 'REFUNDED',
});

const POLICY = Object.freeze({
  managerApprovalThreshold: 10000,
});

function createRefundsService({ repository, logger, events }) {
  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function roleCanApproveHighRefund(role) {
    const normalized = String(role || '').trim().toLowerCase();
    return normalized === 'admin' || normalized === 'super_admin' || normalized === 'manager' || normalized === 'sales_manager';
  }

  async function getById(id, context = {}) {
    logger.debug({ module: 'refunds', requestId: context.requestId, id }, 'Getting refund by id');
    const refund = await repository.findById(id);

    if (!refund) {
      throw new AppError(404, 'Refund not found', 'REFUND_NOT_FOUND');
    }

    return refund;
  }

  async function getBookingById(bookingId) {
    const booking = await repository.findBookingById(bookingId);
    if (!booking || booking.isDeleted) {
      throw new AppError(404, 'Booking not found', 'REFUND_BOOKING_NOT_FOUND');
    }

    return booking;
  }

  async function getPaymentById(paymentId, bookingId) {
    const payment = await repository.findPaymentById(paymentId);
    if (!payment) {
      throw new AppError(404, 'Payment not found', 'REFUND_PAYMENT_NOT_FOUND');
    }

    if (payment.bookingId !== bookingId) {
      throw new AppError(409, 'Payment does not belong to booking', 'REFUND_PAYMENT_BOOKING_MISMATCH');
    }

    return payment;
  }

  async function getRefundableBalance(bookingId) {
    const [paidAmount, processedRefundAmount] = await Promise.all([
      repository.getVerifiedPaidAmount(bookingId),
      repository.getProcessedRefundAmount(bookingId),
    ]);

    return {
      paidAmount,
      processedRefundAmount,
      refundableBalance: Math.max(Number((paidAmount - processedRefundAmount).toFixed(2)), 0),
    };
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

  function buildCreateRecord(payload) {
    return {
      booking_id: payload.bookingId,
      payment_id: payload.paymentId || null,
      refund_amount: toNumber(payload.refundAmount, 0),
      gateway_refund_id: payload.gatewayRefundId || null,
      supplier_penalty: toNumber(payload.supplierPenalty, 0),
      service_charge: toNumber(payload.serviceCharge, 0),
      status: REFUND_STATUS.INITIATED,
    };
  }

  return Object.freeze({
    REFUND_STATUS,
    syncBookingPaymentSummary,

    async list(filters = {}, context = {}) {
      logger.debug({ module: 'refunds', requestId: context.requestId, filters }, 'Listing refunds');
      return repository.findAll(filters);
    },

    getById,

    async create(payload, context = {}) {
      const booking = await getBookingById(payload.bookingId);

      if (payload.paymentId) {
        await getPaymentById(payload.paymentId, booking.id);
      }

      const policy = await getRefundableBalance(booking.id);
      const requestedRefund = toNumber(payload.refundAmount, 0);

      if (requestedRefund > policy.refundableBalance) {
        throw new AppError(
          409,
          `Refund amount exceeds refundable balance ${policy.refundableBalance}.`,
          'REFUND_EXCEEDS_REFUNDABLE_BALANCE',
        );
      }

      const created = await repository.create(buildCreateRecord(payload));
      events.emitCreated(created);
      return created;
    },

    async update(id, payload, context = {}) {
      const existing = await getById(id, context);
      if (existing.status !== REFUND_STATUS.INITIATED) {
        throw new AppError(409, 'Only initiated refunds can be updated.', 'REFUND_UPDATE_LOCKED');
      }

      const patch = {};
      if (payload.refundAmount !== undefined) {
        patch.refund_amount = toNumber(payload.refundAmount, existing.refundAmount);
      }
      if (payload.supplierPenalty !== undefined) {
        patch.supplier_penalty = toNumber(payload.supplierPenalty, existing.supplierPenalty);
      }
      if (payload.serviceCharge !== undefined) {
        patch.service_charge = toNumber(payload.serviceCharge, existing.serviceCharge);
      }
      if (payload.gatewayRefundId !== undefined) {
        patch.gateway_refund_id = payload.gatewayRefundId || null;
      }

      const policy = await getRefundableBalance(existing.bookingId);
      const nextRefundAmount = patch.refund_amount ?? existing.refundAmount;
      const availableForUpdate = policy.refundableBalance + existing.refundAmount;

      if (toNumber(nextRefundAmount, 0) > availableForUpdate) {
        throw new AppError(
          409,
          `Refund amount exceeds refundable balance ${availableForUpdate}.`,
          'REFUND_EXCEEDS_REFUNDABLE_BALANCE',
        );
      }

      const updated = await repository.update(id, patch);
      events.emitUpdated(updated);
      return updated;
    },

    async approve(id, payload = {}, context = {}) {
      const existing = await getById(id, context);

      if (existing.status !== REFUND_STATUS.INITIATED) {
        throw new AppError(409, 'Only initiated refunds can be approved.', 'REFUND_APPROVAL_INVALID_STATE');
      }

      if (
        existing.refundAmount > POLICY.managerApprovalThreshold &&
        !roleCanApproveHighRefund(context.user?.role)
      ) {
        throw new AppError(
          403,
          `Refund above ${POLICY.managerApprovalThreshold} requires manager/admin approval.`,
          'REFUND_MANAGER_APPROVAL_REQUIRED',
        );
      }

      const updated = await repository.update(id, {
        status: REFUND_STATUS.APPROVED,
        approved_by: context.user?.id || null,
      });

      events.emitApproved({
        id: updated.id,
        approvedBy: context.user?.id || null,
        note: payload.note || null,
      });
      events.emitUpdated(updated);

      return updated;
    },

    async reject(id, payload = {}, context = {}) {
      const existing = await getById(id, context);
      if (existing.status === REFUND_STATUS.PROCESSED) {
        throw new AppError(409, 'Processed refunds cannot be rejected.', 'REFUND_REJECT_INVALID_STATE');
      }

      if (existing.status === REFUND_STATUS.REJECTED) {
        return existing;
      }

      const updated = await repository.update(id, {
        status: REFUND_STATUS.REJECTED,
      });

      events.emitRejected({
        id: updated.id,
        rejectedBy: context.user?.id || null,
        reason: payload.reason || null,
      });
      events.emitUpdated(updated);

      return updated;
    },

    async process(id, payload = {}, context = {}) {
      const existing = await getById(id, context);
      if (existing.status !== REFUND_STATUS.APPROVED) {
        throw new AppError(409, 'Only approved refunds can be processed.', 'REFUND_PROCESS_INVALID_STATE');
      }

      const updated = await repository.update(id, {
        status: REFUND_STATUS.PROCESSED,
        gateway_refund_id: payload.gatewayRefundId || existing.gatewayRefundId || null,
        processed_at: payload.processedAt || new Date().toISOString(),
      });

      if (existing.paymentId && payload.markPaymentRefunded !== false) {
        const payment = await repository.findPaymentById(existing.paymentId);
        if (payment && existing.refundAmount >= payment.amount) {
          await repository.updatePayment(payment.id, {
            status: PAYMENT_STATUS.REFUNDED,
            updated_at: new Date().toISOString(),
          });
        }
      }

      const booking = await syncBookingPaymentSummary(existing.bookingId);

      events.emitProcessed({
        id: updated.id,
        bookingId: existing.bookingId,
        processedBy: context.user?.id || null,
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

module.exports = { createRefundsService, REFUND_STATUS };
