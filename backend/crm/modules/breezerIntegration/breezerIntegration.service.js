import { mapBookingCreatedPayload } from "./breezerIntegration.mapper.js";

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
        "x-idempotency-key": `${payload.eventType}:${payload.bookingId}`,
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
function createBreezerIntegrationService({ bookingsService, logger }) {
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

  return Object.freeze({
    sendBookingCreated,
    mapBookingCreatedPayload,
  });
}

export { createBreezerIntegrationService };
