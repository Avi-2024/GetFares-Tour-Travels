import { AppError } from "../../core/errors/index.js";

const BOOKING_STATUS = Object.freeze({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  FULL: "FULL",
  REFUNDED: "REFUNDED",
});

const PAYMENT_POLICY = Object.freeze({
  refundableAdvanceRatio: 0.5,
});

const DEADLINE_RISK = Object.freeze({
  SAFE: "SAFE",
  D2_DUE: "D2_DUE",
  DEADLINE_DUE: "DEADLINE_DUE",
  OVERDUE: "OVERDUE",
});

function createBookingsService({ repository, logger, events, config }) {
  const reminderConfig = {
    preTravelDays: config?.whatsapp?.preTravelDays ?? 2,
    postTravelDays: config?.whatsapp?.postTravelDays ?? 1,
  };
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

  function isIsoDateTime(value) {
    if (!value) {
      return false;
    }
    return !Number.isNaN(new Date(value).getTime());
  }

  function toDateOnly(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  function normalizeObject(value, fallback = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return fallback;
    }
    return value;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeDateTime(value) {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(
        400,
        "Invalid date-time value in booking deadline fields",
        "BOOKING_INVALID_DEADLINE_DATETIME",
      );
    }
    return parsed.toISOString();
  }

  function computeDeadlineInsights(booking, referenceTime = new Date()) {
    const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
    const supplierDeadlineRaw = booking?.supplierPaymentDeadlineAt || null;
    const cancellationDeadlineRaw = booking?.cancellationDeadlineAt || null;
    const supplierDeadline = supplierDeadlineRaw ? new Date(supplierDeadlineRaw) : null;
    const cancellationDeadline = cancellationDeadlineRaw
      ? new Date(cancellationDeadlineRaw)
      : null;
    const deadlineDueStart =
      supplierDeadline ?
        new Date(supplierDeadline.getTime() - 24 * 60 * 60 * 1000)
      : null;
    const balanceDueBy = supplierDeadline
      ? new Date(supplierDeadline.getTime() - 2 * 24 * 60 * 60 * 1000)
      : null;

    let deadlineRiskLevel = DEADLINE_RISK.SAFE;
    if (supplierDeadline) {
      if (now.getTime() > supplierDeadline.getTime()) {
        deadlineRiskLevel = DEADLINE_RISK.OVERDUE;
      } else if (
        deadlineDueStart &&
        now.getTime() >= deadlineDueStart.getTime() &&
        now.getTime() <= supplierDeadline.getTime()
      ) {
        deadlineRiskLevel = DEADLINE_RISK.DEADLINE_DUE;
      } else if (
        balanceDueBy &&
        now.getTime() >= balanceDueBy.getTime() &&
        deadlineDueStart &&
        now.getTime() < deadlineDueStart.getTime()
      ) {
        deadlineRiskLevel = DEADLINE_RISK.D2_DUE;
      } else if (
        balanceDueBy &&
        now.getTime() >= balanceDueBy.getTime() &&
        !deadlineDueStart
      ) {
        deadlineRiskLevel = DEADLINE_RISK.D2_DUE;
      }
    }

    return {
      supplierPaymentDeadlineAt:
        supplierDeadline && !Number.isNaN(supplierDeadline.getTime())
          ? supplierDeadline.toISOString()
          : null,
      cancellationDeadlineAt:
        cancellationDeadline && !Number.isNaN(cancellationDeadline.getTime())
          ? cancellationDeadline.toISOString()
          : null,
      balanceDueBy:
        balanceDueBy && !Number.isNaN(balanceDueBy.getTime())
          ? balanceDueBy.toISOString()
          : null,
      deadlineRiskLevel,
      deadlineLastEvaluatedAt: now.toISOString(),
    };
  }

  function withDeadlineInsights(booking, referenceTime = new Date()) {
    if (!booking) {
      return booking;
    }
    const insights = computeDeadlineInsights(booking, referenceTime);
    return {
      ...booking,
      ...insights,
    };
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

    return Number(
      (totalAmount * PAYMENT_POLICY.refundableAdvanceRatio).toFixed(2),
    );
  }

  async function getById(id, context = {}) {
    logger.debug(
      { module: "bookings", requestId: context.requestId, id },
      "Getting booking by id",
    );

    const booking = await repository.findById(id);
    if (!booking || booking.isDeleted) {
      throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    }

    return withDeadlineInsights(booking);
  }

  async function ensureQuotationExists(quotationId) {
    const quotation = await repository.findQuotationById(quotationId);
    if (!quotation) {
      throw new AppError(
        404,
        "Quotation not found",
        "BOOKING_QUOTATION_NOT_FOUND",
      );
    }

    if (quotation.isDeleted) {
      throw new AppError(
        404,
        "Quotation not found",
        "BOOKING_QUOTATION_NOT_FOUND",
      );
    }

    const status = String(quotation.status || "").toUpperCase();
    if (status !== "APPROVED") {
      throw new AppError(
        409,
        "Only APPROVED quotations can be used to create a booking.",
        "BOOKING_QUOTATION_NOT_APPROVED",
      );
    }

    return quotation;
  }

  async function ensureBookingNumberUnique(bookingNumber, exceptId = null) {
    if (!bookingNumber) {
      return;
    }

    const existing = await repository.findByBookingNumber(bookingNumber);
    if (existing && existing.id !== exceptId) {
      throw new AppError(
        409,
        "Booking number already exists",
        "BOOKING_NUMBER_EXISTS",
      );
    }
  }

  async function appendStatusHistory({
    bookingId,
    oldStatus,
    newStatus,
    changedBy,
    changedAt,
  }) {
    await repository.createStatusHistory({
      bookingId,
      oldStatus: oldStatus || null,
      newStatus,
      changedBy: changedBy || null,
      changedAt: changedAt || new Date().toISOString(),
    });
  }

  async function assertPaymentPolicyForConfirmation(booking) {
    const snapshot = await repository.getPaymentPolicySnapshot(
      booking.id,
      booking.advanceRequired,
    );

    if (!snapshot.meetsAdvance) {
      throw new AppError(
        409,
        `Advance payment requirement not met. Required ${booking.advanceRequired}, received ${snapshot.paidAmount}.`,
        "BOOKING_ADVANCE_NOT_MET",
      );
    }

    if (!snapshot.hasProof) {
      throw new AppError(
        409,
        "No verified payment proof found for confirmation.",
        "BOOKING_PAYMENT_PROOF_REQUIRED",
      );
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

    const netReceived = Math.max(
      Number((paidAmount - refundedAmount).toFixed(2)),
      0,
    );
    const totalAmount = toNumber(booking.totalAmount, 0);

    let paymentStatus = PAYMENT_STATUS.PENDING;
    if (refundedAmount > 0 && netReceived === 0) {
      paymentStatus = PAYMENT_STATUS.REFUNDED;
    } else if (netReceived > 0 && netReceived < totalAmount) {
      paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else if (netReceived >= totalAmount && totalAmount > 0) {
      paymentStatus = PAYMENT_STATUS.FULL;
    }

    const updated = await repository.update(bookingId, {
      advance_received: netReceived,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    });
    return withDeadlineInsights(updated);
  }

  async function transitionStatus(id, payload, context = {}) {
    const existing = await getById(id, context);
    const nextStatus = toUpperText(payload.status);
    if (!nextStatus || !BOOKING_STATUS[nextStatus]) {
      throw new AppError(
        400,
        "Invalid booking status transition request",
        "BOOKING_INVALID_STATUS",
      );
    }

    if (existing.status === nextStatus) {
      return existing;
    }

    if (
      existing.status === BOOKING_STATUS.CANCELLED &&
      nextStatus !== BOOKING_STATUS.CANCELLED
    ) {
      throw new AppError(
        409,
        "Cancelled booking cannot transition to another status.",
        "BOOKING_STATUS_LOCKED",
      );
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
        throw new AppError(
          400,
          "cancellationReason is required when status is CANCELLED",
          "BOOKING_CANCEL_REASON_REQUIRED",
        );
      }

      updatePayload.status = BOOKING_STATUS.CANCELLED;
      updatePayload.cancellation_reason = payload.cancellationReason;
      updatePayload.cancelled_at = changedAt;
    } else {
      updatePayload.status = BOOKING_STATUS.PENDING;
    }

    updatePayload.updated_at = changedAt;

    const updated = await repository.update(existing.id, updatePayload);
    const hydrated = withDeadlineInsights(updated);
    await appendStatusHistory({
      bookingId: existing.id,
      oldStatus: existing.status,
      newStatus: hydrated.status,
      changedBy: context.user?.id || null,
      changedAt,
    });

    events.emitStatusChanged({
      id: hydrated.id,
      oldStatus: existing.status,
      newStatus: hydrated.status,
      changedBy: context.user?.id || null,
    });
    events.emitUpdated(hydrated);

    return hydrated;
  }

  async function runTravelReminders(payload = {}, context = {}) {
    const referenceDate = payload.referenceDate
      ? new Date(payload.referenceDate)
      : new Date();
    if (Number.isNaN(referenceDate.getTime())) {
      throw new AppError(
        400,
        "referenceDate is invalid",
        "BOOKING_REMINDER_INVALID_DATE",
      );
    }

    const preTravelDays =
      payload.preTravelDays ?? reminderConfig.preTravelDays ?? 2;
    const postTravelDays =
      payload.postTravelDays ?? reminderConfig.postTravelDays ?? 1;

    const preTravelDate = toDateOnly(addDays(referenceDate, preTravelDays));
    const postTravelDate = toDateOnly(addDays(referenceDate, -postTravelDays));

    const [preCandidates, postCandidates] = await Promise.all([
      repository.findTravelReminderCandidates({
        reminderType: "PRE_TRAVEL",
        scheduledFor: preTravelDate,
      }),
      repository.findTravelReminderCandidates({
        reminderType: "POST_TRAVEL",
        scheduledFor: postTravelDate,
      }),
    ]);

    const now = new Date().toISOString();
    for (const booking of preCandidates) {
      try {
        await repository.createReminderLog({
          bookingId: booking.id,
          reminderType: "PRE_TRAVEL",
          scheduledFor: preTravelDate,
          sentAt: now,
        });
      } catch (error) {
        logger?.warn(
          { err: error, bookingId: booking.id },
          "Failed to log pre-travel reminder",
        );
      }
      events?.emitPreTravelReminder?.({
        bookingId: booking.id,
        scheduledFor: preTravelDate,
        travelStartDate: booking.travelStartDate || null,
        context: {
          requestId: context.requestId || null,
        },
      });
    }

    for (const booking of postCandidates) {
      try {
        await repository.createReminderLog({
          bookingId: booking.id,
          reminderType: "POST_TRAVEL",
          scheduledFor: postTravelDate,
          sentAt: now,
        });
      } catch (error) {
        logger?.warn(
          { err: error, bookingId: booking.id },
          "Failed to log post-travel reminder",
        );
      }
      events?.emitPostTravelFeedback?.({
        bookingId: booking.id,
        scheduledFor: postTravelDate,
        travelEndDate: booking.travelEndDate || null,
        context: {
          requestId: context.requestId || null,
        },
      });
    }

    return {
      preTravel: {
        scheduledFor: preTravelDate,
        count: preCandidates.length,
        bookingIds: preCandidates.map((item) => item.id),
      },
      postTravel: {
        scheduledFor: postTravelDate,
        count: postCandidates.length,
        bookingIds: postCandidates.map((item) => item.id),
      },
    };
  }

  function getDeadlineAlertTypes({
    booking,
    referenceDate,
    lookaheadHours,
  }) {
    const alerts = [];
    const now = referenceDate;
    const supplierDeadline = booking?.supplierPaymentDeadlineAt
      ? new Date(booking.supplierPaymentDeadlineAt)
      : null;
    const cancellationDeadline = booking?.cancellationDeadlineAt
      ? new Date(booking.cancellationDeadlineAt)
      : null;
    const balanceDueBy = booking?.balanceDueBy
      ? new Date(booking.balanceDueBy)
      : null;

    if (supplierDeadline && !Number.isNaN(supplierDeadline.getTime())) {
      const supplierDiffHours =
        (supplierDeadline.getTime() - now.getTime()) / (60 * 60 * 1000);
      if (now.getTime() > supplierDeadline.getTime()) {
        alerts.push("SUPPLIER_DEADLINE_OVERDUE");
      } else {
        if (supplierDiffHours <= lookaheadHours) {
          alerts.push("SUPPLIER_DEADLINE_DUE");
        }
        if (
          balanceDueBy &&
          !Number.isNaN(balanceDueBy.getTime()) &&
          now.getTime() >= balanceDueBy.getTime() &&
          now.getTime() <= supplierDeadline.getTime()
        ) {
          alerts.push("BALANCE_D2_DUE");
        }
      }
    }

    if (cancellationDeadline && !Number.isNaN(cancellationDeadline.getTime())) {
      const cancellationDiffHours =
        (cancellationDeadline.getTime() - now.getTime()) / (60 * 60 * 1000);
      if (now.getTime() > cancellationDeadline.getTime()) {
        alerts.push("CANCELLATION_DEADLINE_OVERDUE");
      } else if (cancellationDiffHours <= lookaheadHours) {
        alerts.push("CANCELLATION_DEADLINE_DUE");
      }
    }

    return [...new Set(alerts)];
  }

  function buildCreateRecord(payload, context = {}) {
    const totalAmount = toNumber(payload.totalAmount, 0);
    const costAmount = toNumber(payload.costAmount, 0);
    const nonRefundable = Boolean(payload.isNonRefundable);
    const minimumAdvance = minimumAdvanceRequired(totalAmount, nonRefundable);
    const requestedAdvance =
      payload.advanceRequired !== undefined
        ? toNumber(payload.advanceRequired, 0)
        : minimumAdvance;

    if (costAmount > totalAmount) {
      throw new AppError(
        400,
        "costAmount cannot be greater than totalAmount",
        "BOOKING_COST_EXCEEDS_TOTAL",
      );
    }

    if (requestedAdvance < minimumAdvance) {
      throw new AppError(
        409,
        `Advance requirement violation. Minimum required is ${minimumAdvance}.`,
        "BOOKING_ADVANCE_POLICY_VIOLATION",
      );
    }

    if (requestedAdvance > totalAmount) {
      throw new AppError(
        400,
        "advanceRequired cannot exceed totalAmount",
        "BOOKING_ADVANCE_EXCEEDS_TOTAL",
      );
    }

    const clientCurrency = payload.clientCurrency
      ? toUpperText(payload.clientCurrency)
      : "INR";
    const supplierCurrency = payload.supplierCurrency
      ? toUpperText(payload.supplierCurrency)
      : "INR";
    const exchangeRate =
      payload.exchangeRate !== undefined
        ? toNumber(payload.exchangeRate, null)
        : null;

    if (
      clientCurrency &&
      supplierCurrency &&
      clientCurrency !== supplierCurrency &&
      !exchangeRate
    ) {
      throw new AppError(
        400,
        "exchangeRate is required when clientCurrency and supplierCurrency differ",
        "BOOKING_EXCHANGE_RATE_REQUIRED",
      );
    }

    const blockingDeadlineAt = normalizeDateTime(payload.blockingDeadlineAt);
    const supplierPaymentDeadlineAt = normalizeDateTime(
      payload.supplierPaymentDeadlineAt,
    );
    const cancellationDeadlineAt = normalizeDateTime(
      payload.cancellationDeadlineAt,
    );
    const insights = computeDeadlineInsights({
      supplierPaymentDeadlineAt,
      cancellationDeadlineAt,
    });

    if (
      supplierPaymentDeadlineAt &&
      blockingDeadlineAt &&
      new Date(blockingDeadlineAt).getTime() >
        new Date(supplierPaymentDeadlineAt).getTime()
    ) {
      throw new AppError(
        400,
        "blockingDeadlineAt cannot be later than supplierPaymentDeadlineAt",
        "BOOKING_INVALID_BLOCKING_DEADLINE",
      );
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
      client_currency: clientCurrency,
      supplier_currency: supplierCurrency,
      exchange_rate: exchangeRate,
      exchange_locked: payload.exchangeLocked ?? false,
      supplier_details: normalizeObject(payload.supplierDetails, {}),
      dmc_details: normalizeObject(payload.dmcDetails, {}),
      hotel_segments: normalizeArray(payload.hotelSegments),
      flight_segments: normalizeArray(payload.flightSegments),
      insurance_details: normalizeObject(payload.insuranceDetails, {}),
      other_services: normalizeArray(payload.otherServices),
      blocking_deadline_at: blockingDeadlineAt,
      supplier_payment_deadline_at: supplierPaymentDeadlineAt,
      cancellation_deadline_at: cancellationDeadlineAt,
      balance_due_by: insights.balanceDueBy,
      deadline_risk_level: insights.deadlineRiskLevel,
      deadline_last_evaluated_at: insights.deadlineLastEvaluatedAt,
      created_by: context.user?.id || null,
      updated_at: new Date().toISOString(),
    };
  }

  return Object.freeze({
    BOOKING_STATUS,
    PAYMENT_STATUS,
    recalculatePaymentStatus,

    async list(filters = {}, context = {}) {
      logger.debug(
        { module: "bookings", requestId: context.requestId, filters },
        "Listing bookings",
      );
      const list = await repository.findAll(filters);
      return list.map((item) => withDeadlineInsights(item));
    },

    async stats(context = {}) {
      logger.debug(
        { module: "bookings", requestId: context.requestId },
        "Fetching booking stats",
      );
      return repository.getStats();
    },

    getById,

    async create(payload, context = {}) {
      await ensureQuotationExists(payload.quotationId);

      const existingForQuotation = await repository.findByQuotationId(
        payload.quotationId,
      );
      if (existingForQuotation && !existingForQuotation.isDeleted) {
        throw new AppError(
          409,
          "A booking already exists for this quotation.",
          "BOOKING_ALREADY_EXISTS_FOR_QUOTATION",
        );
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

      const hydrated = withDeadlineInsights(created);
      events.emitCreated(hydrated);
      return hydrated;
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
        updatePayload.total_amount = toNumber(
          payload.totalAmount,
          existing.totalAmount,
        );
      }
      if (payload.costAmount !== undefined) {
        updatePayload.cost_amount = toNumber(
          payload.costAmount,
          existing.costAmount,
        );
      }
      if (payload.advanceRequired !== undefined) {
        updatePayload.advance_required = toNumber(
          payload.advanceRequired,
          existing.advanceRequired,
        );
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
        if (existing.exchangeLocked) {
          throw new AppError(
            409,
            "Exchange rate is locked for this booking and cannot be edited.",
            "BOOKING_EXCHANGE_LOCKED",
          );
        }
        updatePayload.exchange_rate = toNumber(payload.exchangeRate, null);
      }
      if (payload.exchangeLocked !== undefined) {
        if (payload.exchangeLocked === true) {
          const currentRate =
            updatePayload.exchange_rate ?? existing.exchangeRate;
          if (!currentRate || Number(currentRate) <= 0) {
            throw new AppError(
              400,
              "A valid exchangeRate is required before locking exchange.",
              "BOOKING_EXCHANGE_RATE_REQUIRED_FOR_LOCK",
            );
          }
        }
        updatePayload.exchange_locked = payload.exchangeLocked;
      }
      if (payload.cancellationReason !== undefined) {
        updatePayload.cancellation_reason = payload.cancellationReason;
      }
      if (payload.supplierDetails !== undefined) {
        updatePayload.supplier_details = normalizeObject(payload.supplierDetails, {});
      }
      if (payload.dmcDetails !== undefined) {
        updatePayload.dmc_details = normalizeObject(payload.dmcDetails, {});
      }
      if (payload.hotelSegments !== undefined) {
        updatePayload.hotel_segments = normalizeArray(payload.hotelSegments);
      }
      if (payload.flightSegments !== undefined) {
        updatePayload.flight_segments = normalizeArray(payload.flightSegments);
      }
      if (payload.insuranceDetails !== undefined) {
        updatePayload.insurance_details = normalizeObject(
          payload.insuranceDetails,
          {},
        );
      }
      if (payload.otherServices !== undefined) {
        updatePayload.other_services = normalizeArray(payload.otherServices);
      }
      if (payload.blockingDeadlineAt !== undefined) {
        updatePayload.blocking_deadline_at = normalizeDateTime(
          payload.blockingDeadlineAt,
        );
      }
      if (payload.supplierPaymentDeadlineAt !== undefined) {
        updatePayload.supplier_payment_deadline_at = normalizeDateTime(
          payload.supplierPaymentDeadlineAt,
        );
      }
      if (payload.cancellationDeadlineAt !== undefined) {
        updatePayload.cancellation_deadline_at = normalizeDateTime(
          payload.cancellationDeadlineAt,
        );
      }

      if (
        (updatePayload.travel_start_date || existing.travelStartDate) &&
        (updatePayload.travel_end_date || existing.travelEndDate)
      ) {
        const startDate =
          updatePayload.travel_start_date || existing.travelStartDate;
        const endDate = updatePayload.travel_end_date || existing.travelEndDate;
        if (endDate < startDate) {
          throw new AppError(
            400,
            "travelEndDate must be on or after travelStartDate",
            "BOOKING_INVALID_TRAVEL_DATES",
          );
        }
      }

      const nextTotalAmount =
        updatePayload.total_amount ?? existing.totalAmount;
      const nextCostAmount = updatePayload.cost_amount ?? existing.costAmount;
      const nextClientCurrency =
        updatePayload.client_currency ?? existing.clientCurrency ?? "INR";
      const nextSupplierCurrency =
        updatePayload.supplier_currency ?? existing.supplierCurrency ?? "INR";
      const nextExchangeRate =
        updatePayload.exchange_rate ?? existing.exchangeRate ?? null;
      if (toNumber(nextCostAmount, 0) > toNumber(nextTotalAmount, 0)) {
        throw new AppError(
          400,
          "costAmount cannot be greater than totalAmount",
          "BOOKING_COST_EXCEEDS_TOTAL",
        );
      }

      if (nextClientCurrency !== nextSupplierCurrency && !nextExchangeRate) {
        throw new AppError(
          400,
          "exchangeRate is required when clientCurrency and supplierCurrency differ",
          "BOOKING_EXCHANGE_RATE_REQUIRED",
        );
      }

      if (
        updatePayload.advance_required !== undefined &&
        toNumber(updatePayload.advance_required, 0) >
          toNumber(nextTotalAmount, 0)
      ) {
        throw new AppError(
          400,
          "advanceRequired cannot exceed totalAmount",
          "BOOKING_ADVANCE_EXCEEDS_TOTAL",
        );
      }

      const minimumAdvance = minimumAdvanceRequired(
        toNumber(nextTotalAmount, 0),
        false,
      );
      const nextAdvanceRequired =
        updatePayload.advance_required ?? existing.advanceRequired;
      if (toNumber(nextAdvanceRequired, 0) < minimumAdvance) {
        throw new AppError(
          409,
          `Advance requirement violation. Minimum required is ${minimumAdvance}.`,
          "BOOKING_ADVANCE_POLICY_VIOLATION",
        );
      }

      const resolvedBlockingDeadlineAt =
        updatePayload.blocking_deadline_at !== undefined
          ? updatePayload.blocking_deadline_at
          : existing.blockingDeadlineAt;
      const resolvedSupplierPaymentDeadlineAt =
        updatePayload.supplier_payment_deadline_at !== undefined
          ? updatePayload.supplier_payment_deadline_at
          : existing.supplierPaymentDeadlineAt;
      const resolvedCancellationDeadlineAt =
        updatePayload.cancellation_deadline_at !== undefined
          ? updatePayload.cancellation_deadline_at
          : existing.cancellationDeadlineAt;

      if (
        resolvedBlockingDeadlineAt &&
        resolvedSupplierPaymentDeadlineAt &&
        new Date(resolvedBlockingDeadlineAt).getTime() >
          new Date(resolvedSupplierPaymentDeadlineAt).getTime()
      ) {
        throw new AppError(
          400,
          "blockingDeadlineAt cannot be later than supplierPaymentDeadlineAt",
          "BOOKING_INVALID_BLOCKING_DEADLINE",
        );
      }

      const deadlineInsights = computeDeadlineInsights({
        supplierPaymentDeadlineAt: resolvedSupplierPaymentDeadlineAt,
        cancellationDeadlineAt: resolvedCancellationDeadlineAt,
      });
      updatePayload.balance_due_by = deadlineInsights.balanceDueBy;
      updatePayload.deadline_risk_level = deadlineInsights.deadlineRiskLevel;
      updatePayload.deadline_last_evaluated_at =
        deadlineInsights.deadlineLastEvaluatedAt;

      updatePayload.updated_at = new Date().toISOString();

      const updated = await repository.update(id, updatePayload);
      const hydrated = withDeadlineInsights(updated);
      events.emitUpdated(hydrated);
      return hydrated;
    },

    transitionStatus,
    runTravelReminders,
    async processDeadlineAlerts(payload = {}, context = {}) {
      const referenceDate = payload.referenceTime
        ? new Date(payload.referenceTime)
        : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        throw new AppError(
          400,
          "referenceTime is invalid",
          "BOOKING_DEADLINE_INVALID_REFERENCE_TIME",
        );
      }

      const lookaheadHoursRaw = Number(
        payload.lookaheadHours ??
          config?.automation?.deadlineLookaheadHours ??
          24,
      );
      const lookaheadHours =
        Number.isFinite(lookaheadHoursRaw) && lookaheadHoursRaw > 0
          ? Math.min(Math.floor(lookaheadHoursRaw), 240)
          : 24;
      const limitRaw = Number(payload.limit ?? 200);
      const limit =
        Number.isFinite(limitRaw) && limitRaw > 0
          ? Math.min(Math.floor(limitRaw), 1000)
          : 200;
      const candidates = await repository.findDeadlineCandidates({ limit });

      const summary = {
        processed: candidates.length,
        triggered: 0,
        skipped: 0,
        alerts: [],
      };
      const alertDate = referenceDate.toISOString().slice(0, 10);

      for (const booking of candidates) {
        const hydrated = withDeadlineInsights(booking, referenceDate);

        await repository.update(booking.id, {
          balance_due_by: hydrated.balanceDueBy,
          deadline_risk_level: hydrated.deadlineRiskLevel,
          deadline_last_evaluated_at: hydrated.deadlineLastEvaluatedAt,
          updated_at: new Date().toISOString(),
        });

        const alertTypes = getDeadlineAlertTypes({
          booking: hydrated,
          referenceDate,
          lookaheadHours,
        });

        if (!alertTypes.length) {
          summary.skipped += 1;
          continue;
        }

        for (const alertType of alertTypes) {
          const existing = await repository.findDeadlineAlertLog({
            bookingId: hydrated.id,
            alertType,
            alertDate,
          });
          if (existing) {
            summary.skipped += 1;
            continue;
          }

          await repository.createDeadlineAlertLog({
            bookingId: hydrated.id,
            alertType,
            alertDate,
            metadata: {
              bookingNumber: hydrated.bookingNumber,
              deadlineRiskLevel: hydrated.deadlineRiskLevel,
              supplierPaymentDeadlineAt: hydrated.supplierPaymentDeadlineAt,
              cancellationDeadlineAt: hydrated.cancellationDeadlineAt,
              balanceDueBy: hydrated.balanceDueBy,
            },
          });

          const eventPayload = {
            bookingId: hydrated.id,
            leadId: hydrated.leadId || null,
            bookingNumber: hydrated.bookingNumber || null,
            alertType,
            alertDate,
            deadlineRiskLevel: hydrated.deadlineRiskLevel,
            supplierPaymentDeadlineAt: hydrated.supplierPaymentDeadlineAt,
            cancellationDeadlineAt: hydrated.cancellationDeadlineAt,
            balanceDueBy: hydrated.balanceDueBy,
            triggeredBy: context.user?.id || null,
          };
          events.emitDeadlineAlert(eventPayload);
          events.emitUpdated(hydrated);
          summary.alerts.push(eventPayload);
          summary.triggered += 1;
        }
      }

      return summary;
    },

    async listStatusHistory(id, context = {}) {
      await getById(id, context);
      return repository.listStatusHistory(id);
    },

    async generateInvoice(id, payload = {}, context = {}) {
      const booking = await getById(id, context);

      let invoiceNumber =
        payload.invoiceNumber || buildInvoiceNumber(booking.bookingNumber);
      let invoice = await repository.findInvoiceByNumber(invoiceNumber);

      if (invoice) {
        invoiceNumber = buildInvoiceNumber(`${booking.bookingNumber || "BK"}R`);
        invoice = await repository.findInvoiceByNumber(invoiceNumber);
        if (invoice) {
          throw new AppError(
            409,
            "Unable to generate unique invoice number",
            "BOOKING_INVOICE_NUMBER_EXISTS",
          );
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

export { createBookingsService, BOOKING_STATUS, PAYMENT_STATUS };
