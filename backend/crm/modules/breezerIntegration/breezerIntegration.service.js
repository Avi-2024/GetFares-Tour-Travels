import {
  isVisaBooking,
  mapBookingCreatedPayload,
  mapPaymentPayload,
  mapRefundPayload,
  mapVisaCreatedPayloadFromBooking,
} from "./breezerIntegration.mapper.js";

const DEFAULT_TIMEOUT_MS = 10000;

// Reads a boolean environment flag.
function envFlag(name) {
  return String(process.env[name] || "")
    .trim()
    .toLowerCase() === "true";
}

// Reads Breezer webhook runtime configuration from environment variables.
function getConfig() {
  const timeoutMs = Number(
    process.env.BREEZER_WEBHOOK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );

  return {
    enabled: envFlag("BREEZER_WEBHOOK_ENABLED"),
    url: String(process.env.BREEZER_WEBHOOK_URL || "").trim(),
    visaUrl: String(
      process.env.BREEZER_VISA_WEBHOOK_URL ||
        process.env.BREEZER_WEBHOOK_URL ||
        "",
    ).trim(),
    apiKey: String(process.env.BREEZER_WEBHOOK_API_KEY || "").trim(),
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

// Builds an internal super-admin context for reading booking details.
function createSystemContext() {
  return {
    requestId: "breezer-booking-webhook",
    user: {
      id: "system-breezer-webhook",
      role: "super_admin",
      email: "system@get2vacations.local",
    },
  };
}

// Posts JSON to Breezer with timeout and idempotency headers.
async function postJson({ url, apiKey, payload, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-source-system": "get2vacations-crm",
        "x-idempotency-key": [
          payload.eventType,
          payload.bookingId,
          payload.visa?.visaId,
        ]
          .filter(Boolean)
          .join(":"),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Breezer webhook HTTP ${response.status}: ${text}`);
    }

    return { ok: true, status: response.status, body: text };
  } finally {
    clearTimeout(timeout);
  }
}

// Creates the Breezer integration service.
function createBreezerIntegrationService({
  bookingsService,
  paymentsService,
  refundsService,
  logger,
}) {
  // Loads the latest enriched booking where possible.
  async function getHydratedBooking(bookingOrId) {
    const hasBookingObject = bookingOrId && typeof bookingOrId === "object";

    if (hasBookingObject && bookingOrId.id) {
      try {
        return await bookingsService.getById(
          bookingOrId.id,
          createSystemContext(),
        );
      } catch {
        // Event payload is still good enough for a best-effort webhook.
        return bookingOrId;
      }
    }

    return bookingsService.getById(String(bookingOrId), createSystemContext());
  }

  // Sends one booking.created payload to Breezer CRM.
  async function sendBookingCreated(bookingOrId, options = {}) {
    const config = getConfig();
    const booking = await getHydratedBooking(bookingOrId);
    const payload = mapBookingCreatedPayload(booking);

    if (!config.enabled) {
      logger?.info(
        { module: "breezerIntegration", bookingId: booking.id, payload },
        "Breezer booking webhook skipped because integration is disabled",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_ENABLED is not true",
        payload,
      };
    }

    if (!config.url || !config.apiKey) {
      logger?.warn(
        { module: "breezerIntegration", bookingId: booking.id },
        "Breezer booking webhook skipped because URL/API key is missing",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_URL or BREEZER_WEBHOOK_API_KEY missing",
        payload,
      };
    }

    const result = await postJson({
      url: config.url,
      apiKey: config.apiKey,
      payload,
      timeoutMs: config.timeoutMs,
    });

    logger?.info(
      {
        module: "breezerIntegration",
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: result.status,
        trigger: options.trigger || "manual",
      },
      "Breezer booking.created webhook delivered",
    );

    return { ...result, payload };
  }

  async function getHydratedPayment(paymentOrId) {
    if (!paymentsService?.getById) {
      throw new Error("Payments service is not available");
    }
    const hasPaymentObject = paymentOrId && typeof paymentOrId === "object";
    const paymentId = hasPaymentObject ? paymentOrId.id : String(paymentOrId);
    const payment = await paymentsService.getById(paymentId, createSystemContext());
    return { ...paymentOrId, ...payment };
  }

  async function getHydratedRefund(refundOrId) {
    if (!refundsService?.getById) {
      throw new Error("Refunds service is not available");
    }
    const hasRefundObject = refundOrId && typeof refundOrId === "object";
    const refundId = hasRefundObject ? refundOrId.id : String(refundOrId);
    const refund = await refundsService.getById(refundId, createSystemContext());
    return { ...refundOrId, ...refund };
  }

  // Sends one separate visa.created payload to Breezer CRM for VISA bookings.
  async function sendVisaCreatedForBooking(bookingOrId, options = {}) {
    const config = getConfig();
    const booking = await getHydratedBooking(bookingOrId);
    const payload = mapVisaCreatedPayloadFromBooking(booking);

    if (!isVisaBooking(booking)) {
      return {
        skipped: true,
        reason: "Booking leadType is not VISA",
        payload,
      };
    }

    if (!config.enabled) {
      logger?.info(
        { module: "breezerIntegration", bookingId: booking.id, payload },
        "Breezer visa webhook skipped because integration is disabled",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_ENABLED is not true",
        payload,
      };
    }

    if (!config.visaUrl || !config.apiKey) {
      logger?.warn(
        { module: "breezerIntegration", bookingId: booking.id },
        "Breezer visa webhook skipped because URL/API key is missing",
      );
      return {
        skipped: true,
        reason: "BREEZER_VISA_WEBHOOK_URL/BREEZER_WEBHOOK_URL or BREEZER_WEBHOOK_API_KEY missing",
        payload,
      };
    }

    const result = await postJson({
      url: config.visaUrl,
      apiKey: config.apiKey,
      payload,
      timeoutMs: config.timeoutMs,
    });

    logger?.info(
      {
        module: "breezerIntegration",
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: result.status,
        trigger: options.trigger || "manual",
      },
      "Breezer visa.created webhook delivered",
    );

    return { ...result, payload };
  }

  async function sendPayment(paymentOrId, eventType, options = {}) {
    const config = getConfig();
    const payment = await getHydratedPayment(paymentOrId);
    const booking = await getHydratedBooking(payment.bookingId);
    const payload = mapPaymentPayload({ payment, booking, eventType });

    if (!config.enabled) {
      logger?.info(
        { module: "breezerIntegration", paymentId: payment.id, payload },
        "Breezer payment webhook skipped because integration is disabled",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_ENABLED is not true",
        payload,
      };
    }

    if (!config.url || !config.apiKey) {
      logger?.warn(
        { module: "breezerIntegration", paymentId: payment.id },
        "Breezer payment webhook skipped because URL/API key is missing",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_URL or BREEZER_WEBHOOK_API_KEY missing",
        payload,
      };
    }

    const result = await postJson({
      url: config.url,
      apiKey: config.apiKey,
      payload,
      timeoutMs: config.timeoutMs,
    });

    logger?.info(
      {
        module: "breezerIntegration",
        paymentId: payment.id,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: result.status,
        trigger: options.trigger || "manual",
      },
      "Breezer payment webhook delivered",
    );

    return { ...result, payload };
  }

  async function sendPaymentCreated(paymentOrId, options = {}) {
    return sendPayment(paymentOrId, "payment.created", options);
  }

  async function sendPaymentUpdated(paymentOrId, options = {}) {
    return sendPayment(paymentOrId, "payment.updated", options);
  }

  async function sendRefund(refundOrId, eventType, options = {}) {
    const config = getConfig();
    const refund = await getHydratedRefund(refundOrId);
    const [booking, payment] = await Promise.all([
      getHydratedBooking(refund.bookingId),
      refund.paymentId ? getHydratedPayment(refund.paymentId) : Promise.resolve({}),
    ]);
    const payload = mapRefundPayload({ refund, payment, booking, eventType });

    if (!config.enabled) {
      logger?.info(
        { module: "breezerIntegration", refundId: refund.id, payload },
        "Breezer refund webhook skipped because integration is disabled",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_ENABLED is not true",
        payload,
      };
    }

    if (!config.url || !config.apiKey) {
      logger?.warn(
        { module: "breezerIntegration", refundId: refund.id },
        "Breezer refund webhook skipped because URL/API key is missing",
      );
      return {
        skipped: true,
        reason: "BREEZER_WEBHOOK_URL or BREEZER_WEBHOOK_API_KEY missing",
        payload,
      };
    }

    const result = await postJson({
      url: config.url,
      apiKey: config.apiKey,
      payload,
      timeoutMs: config.timeoutMs,
    });

    logger?.info(
      {
        module: "breezerIntegration",
        refundId: refund.id,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status: result.status,
        trigger: options.trigger || "manual",
      },
      "Breezer refund webhook delivered",
    );

    return { ...result, payload };
  }

  async function sendRefundCreated(refundOrId, options = {}) {
    return sendRefund(refundOrId, "refund.created", options);
  }

  async function sendRefundUpdated(refundOrId, options = {}) {
    return sendRefund(refundOrId, "refund.updated", options);
  }

  // Builds the booking.created payload without sending it to Breezer.
  async function previewBookingCreatedPayload(bookingOrId) {
    const booking = await getHydratedBooking(bookingOrId);
    return mapBookingCreatedPayload(booking);
  }

  // Builds the visa.created payload without sending it to Breezer.
  async function previewVisaCreatedPayload(bookingOrId) {
    const booking = await getHydratedBooking(bookingOrId);
    return mapVisaCreatedPayloadFromBooking(booking);
  }

  async function previewPaymentPayload(paymentOrId, eventType = "payment.created") {
    const payment = await getHydratedPayment(paymentOrId);
    const booking = await getHydratedBooking(payment.bookingId);
    return mapPaymentPayload({ payment, booking, eventType });
  }

  async function previewRefundPayload(refundOrId, eventType = "refund.created") {
    const refund = await getHydratedRefund(refundOrId);
    const [booking, payment] = await Promise.all([
      getHydratedBooking(refund.bookingId),
      refund.paymentId ? getHydratedPayment(refund.paymentId) : Promise.resolve({}),
    ]);
    return mapRefundPayload({ refund, payment, booking, eventType });
  }

  return Object.freeze({
    sendBookingCreated,
    sendPaymentCreated,
    sendPaymentUpdated,
    sendRefundCreated,
    sendRefundUpdated,
    sendVisaCreatedForBooking,
    previewBookingCreatedPayload,
    previewPaymentPayload,
    previewRefundPayload,
    previewVisaCreatedPayload,
    mapBookingCreatedPayload,
    mapPaymentPayload,
    mapRefundPayload,
    mapVisaCreatedPayloadFromBooking,
  });
}

export { createBreezerIntegrationService };
