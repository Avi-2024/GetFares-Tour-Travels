import { AppError } from "../../core/errors/index.js";
import crypto from "node:crypto";

const SUPPORTED_ENTITIES = Object.freeze([
  "customer",
  "lead",
  "booking",
  "payment",
  "refund",
]);

const WEBHOOK_EVENTS = Object.freeze([
  "lead.created",
  "lead.updated",
  "booking.created",
  "booking.updated",
  "payment.created",
  "payment.updated",
  "refund.created",
  "refund.updated",
]);
const RETRY_SECONDS = Object.freeze([5, 30, 120, 600, 3600]);

function createPartnerIntegrationService({ repository, logger, encryptionKey }) {
  const encryptionKeyBuffer = crypto
    .createHash("sha256")
    .update(String(encryptionKey), "utf8")
    .digest();
  let processing = false;

  function encryptSecret(secret) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKeyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    return [
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  function decryptSecret(value) {
    const [iv, tag, encrypted] = String(value || "").split(".");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKeyBuffer,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  function parseJson(value, fallback) {
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function mapEndpoint(row) {
    return {
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      webhookUrl: row.webhook_url,
      subscribedEvents: parseJson(row.subscribed_events, []),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function signPayload(secret, timestamp, rawPayload) {
    return crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawPayload}`, "utf8")
      .digest("hex");
  }

  async function sendWebhook({ url, secret, eventId, payload }) {
    const rawPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    timeout.unref?.();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Get2Vacations-Webhook/1.0",
          "X-Webhook-Id": eventId,
          "X-Webhook-Timestamp": timestamp,
          "X-Webhook-Signature": signPayload(secret, timestamp, rawPayload),
        },
        body: rawPayload,
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw Object.assign(
          new Error(`Webhook returned HTTP ${response.status}: ${responseText}`),
          { httpStatus: response.status },
        );
      }
      return response.status;
    } finally {
      clearTimeout(timeout);
    }
  }
  function encodeCursor(row) {
    if (!row) return null;
    return Buffer.from(
      JSON.stringify({
        changedEpoch: Number(row.changed_epoch),
        entity: row.entity_type,
        id: row.entity_id,
      }),
      "utf8",
    ).toString("base64url");
  }

  function decodeCursor(value) {
    if (!value) {
      return { afterEpoch: 0, afterEntity: "", afterId: "" };
    }
    try {
      const parsed = JSON.parse(
        Buffer.from(String(value), "base64url").toString("utf8"),
      );
      const changedEpoch = Number(parsed.changedEpoch);
      if (!parsed.id || !parsed.entity || !Number.isFinite(changedEpoch)) {
        throw new Error();
      }
      return {
        afterEpoch: changedEpoch,
        afterEntity: String(parsed.entity),
        afterId: String(parsed.id),
      };
    } catch {
      throw new AppError(
        400,
        "Invalid synchronization cursor",
        "INTEGRATION_CURSOR_INVALID",
      );
    }
  }

  function parseEntities(value) {
    if (!value) return [...SUPPORTED_ENTITIES];
    const entities = [
      ...new Set(
        String(value)
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const invalid = entities.filter(
      (entity) => !SUPPORTED_ENTITIES.includes(entity),
    );
    if (invalid.length) {
      throw new AppError(
        400,
        "Unsupported synchronization entity",
        "INTEGRATION_ENTITY_INVALID",
        { invalid, supported: SUPPORTED_ENTITIES },
      );
    }
    return entities;
  }

  async function getLead(id) {
    const data = await repository.findLeadAggregate(id);
    if (!data) {
      throw new AppError(404, "Lead not found", "INTEGRATION_LEAD_NOT_FOUND");
    }
    return data;
  }

  async function getCustomer(id) {
    const data = await repository.findCustomer(id);
    if (!data) {
      throw new AppError(
        404,
        "Customer not found",
        "INTEGRATION_CUSTOMER_NOT_FOUND",
      );
    }
    return data;
  }

  async function getBooking(id) {
    const data = await repository.findBookingAggregate(id);
    if (!data) {
      throw new AppError(
        404,
        "Booking not found",
        "INTEGRATION_BOOKING_NOT_FOUND",
      );
    }
    return data;
  }

  async function listChanges(query = {}) {
    const cursor = decodeCursor(query.cursor);
    const limit = Number(query.limit || 100);
    const rows = await repository.listChanges({
      ...cursor,
      limit: limit + 1,
      entities: parseEntities(query.entities),
    });
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);

    return {
      changes: pageRows.map((row) => ({
        entity: row.entity_type,
        id: row.entity_id,
        rootBookingId: row.root_booking_id,
        operation: row.is_deleted ? "DELETE" : "UPSERT",
        changedAt: new Date(row.changed_at).toISOString(),
        resourceUrl:
          row.root_booking_id
            ? `/api/integrations/v1/bookings/${row.root_booking_id}`
            : row.entity_type === "customer"
              ? `/api/integrations/v1/customers/${row.entity_id}`
              : row.entity_type === "lead"
                ? `/api/integrations/v1/leads/${row.entity_id}`
                : null,
      })),
      nextCursor: encodeCursor(last),
      hasMore,
    };
  }

  async function createWebhookEndpoint(clientId, payload) {
    const signingSecret = `whsec_${crypto.randomBytes(32).toString("base64url")}`;
    const endpoint = await repository.createWebhookEndpoint({
      id: crypto.randomUUID(),
      client_id: clientId,
      name: payload.name,
      webhook_url: payload.webhookUrl,
      signing_secret_encrypted: encryptSecret(signingSecret),
      subscribed_events: JSON.stringify(payload.subscribedEvents),
      is_active: payload.isActive ?? true,
    });
    return { ...mapEndpoint(endpoint), signingSecret };
  }

  async function listWebhookEndpoints(clientId) {
    const rows = await repository.listWebhookEndpoints(clientId);
    return rows.map(mapEndpoint);
  }

  async function updateWebhookEndpoint(clientId, endpointId, payload) {
    const patch = {};
    if (payload.name !== undefined) patch.name = payload.name;
    if (payload.webhookUrl !== undefined) patch.webhook_url = payload.webhookUrl;
    if (payload.subscribedEvents !== undefined) {
      patch.subscribed_events = JSON.stringify(payload.subscribedEvents);
    }
    if (payload.isActive !== undefined) patch.is_active = payload.isActive;
    const updated = await repository.updateWebhookEndpoint(
      clientId,
      endpointId,
      patch,
    );
    if (!updated) {
      throw new AppError(
        404,
        "Webhook endpoint not found",
        "INTEGRATION_WEBHOOK_ENDPOINT_NOT_FOUND",
      );
    }
    return mapEndpoint(updated);
  }

  async function captureWebhookEvent(event) {
    const queued = await repository.enqueueWebhookEvent({
      ...event,
      occurredAt: new Date().toISOString(),
    });
    logger?.info?.(
      {
        module: "partnerIntegration",
        eventType: event.eventType,
        entityId: event.entityId,
        queued,
      },
      "Partner webhook deliveries queued",
    );
    void processWebhookDeliveries();
  }

  async function processWebhookDeliveries() {
    if (processing) return { processed: 0 };
    processing = true;
    let processed = 0;
    try {
      const deliveries = await repository.claimPendingDeliveries(20);
      for (const delivery of deliveries) {
        try {
          const status = await sendWebhook({
            url: delivery.webhook_url,
            secret: decryptSecret(delivery.signing_secret_encrypted),
            eventId: delivery.event_id,
            payload: delivery.payload,
          });
          await repository.markDeliveryDelivered(delivery.id, status);
        } catch (error) {
          const attempt = Number(delivery.attempts || 0);
          await repository.markDeliveryFailed(delivery.id, {
            httpStatus: error.httpStatus || null,
            error: error.message,
            retrySeconds:
              RETRY_SECONDS[Math.min(attempt, RETRY_SECONDS.length - 1)],
          });
          logger?.warn?.(
            {
              module: "partnerIntegration",
              deliveryId: delivery.id,
              eventId: delivery.event_id,
              error: error.message,
            },
            "Partner webhook delivery failed",
          );
        }
        processed += 1;
      }
      return { processed };
    } finally {
      processing = false;
    }
  }

  async function listWebhookDeliveries(clientId, query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 25);
    const result = await repository.listWebhookDeliveries(clientId, {
      page,
      limit,
      status: query.status,
    });
    const diagnostics = await repository.getWebhookDiagnostics(clientId);
    return {
      data: result.rows,
      diagnostics,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async function retryWebhookDelivery(clientId, deliveryId) {
    const retried = await repository.retryWebhookDelivery(clientId, deliveryId);
    if (!retried) {
      throw new AppError(
        404,
        "Webhook delivery not found",
        "INTEGRATION_WEBHOOK_DELIVERY_NOT_FOUND",
      );
    }
    void processWebhookDeliveries();
    return { id: deliveryId, status: "PENDING" };
  }

  async function testWebhookEndpoint(clientId, endpointId) {
    const endpoint = await repository.findWebhookEndpoint(clientId, endpointId);
    if (!endpoint) {
      throw new AppError(
        404,
        "Webhook endpoint not found",
        "INTEGRATION_WEBHOOK_ENDPOINT_NOT_FOUND",
      );
    }
    const eventId = crypto.randomUUID();
    const status = await sendWebhook({
      url: endpoint.webhook_url,
      secret: decryptSecret(endpoint.signing_secret_encrypted),
      eventId,
      payload: {
        eventId,
        eventType: "integration.test",
        entityType: "integration",
        entityId: clientId,
        rootBookingId: null,
        operation: "TEST",
        occurredAt: new Date().toISOString(),
        resourceUrl: null,
      },
    });
    return { delivered: true, httpStatus: status, eventId };
  }

  async function queueDiagnosticWebhook(clientId) {
    const eventId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    const queued = await repository.enqueueTestWebhookEvent(clientId, {
      eventId,
      eventType: "integration.test",
      entityType: "integration",
      entityId: clientId,
      rootBookingId: null,
      payload: {
        eventId,
        eventType: "integration.test",
        entityType: "integration",
        entityId: clientId,
        rootBookingId: null,
        operation: "TEST",
        occurredAt,
        resourceUrl: null,
      },
    });
    void processWebhookDeliveries();
    return { eventId, queued };
  }

  return Object.freeze({
    getCustomer,
    getLead,
    getBooking,
    listChanges,
    createWebhookEndpoint,
    listWebhookEndpoints,
    updateWebhookEndpoint,
    captureWebhookEvent,
    processWebhookDeliveries,
    listWebhookDeliveries,
    retryWebhookDelivery,
    testWebhookEndpoint,
    queueDiagnosticWebhook,
    supportedWebhookEvents: WEBHOOK_EVENTS,
  });
}

export { createPartnerIntegrationService };
