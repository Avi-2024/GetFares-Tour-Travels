function createPartnerIntegrationRepository({ db }) {
  function parseJson(value, fallback = null) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function toIso(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  async function findLeadAggregate(id) {
    const result = await db.query(
      `SELECT
         l.*,
         d.name AS destination_name,
         c.id AS customer_record_id,
         c.full_name AS customer_full_name,
         c.phone AS customer_phone,
         c.email AS customer_email,
         c.preferences AS customer_preferences,
         c.lifetime_value AS customer_lifetime_value,
         c.segment AS customer_segment,
         c.created_at AS customer_created_at,
         c.updated_at AS customer_updated_at
       FROM leads l
       LEFT JOIN destinations d ON BINARY d.id = BINARY l.destination_id
       LEFT JOIN customers c ON BINARY c.id = BINARY COALESCE(
         (
           SELECT cl.customer_id
           FROM customer_leads cl
           WHERE BINARY cl.lead_id = BINARY l.id
             AND COALESCE(cl.is_deleted, 0) = 0
           ORDER BY cl.customer_id ASC
           LIMIT 1
         ),
         (
           SELECT contact_customer.id
           FROM customers contact_customer
           WHERE COALESCE(contact_customer.is_deleted, 0) = 0
             AND (
               (
                 NULLIF(TRIM(l.email), '') IS NOT NULL
                 AND LOWER(TRIM(contact_customer.email)) = LOWER(TRIM(l.email))
               )
               OR (
                 NULLIF(TRIM(l.phone), '') IS NOT NULL
                 AND contact_customer.phone = l.phone
               )
             )
           ORDER BY
             CASE
               WHEN NULLIF(TRIM(l.email), '') IS NOT NULL
                AND LOWER(TRIM(contact_customer.email)) = LOWER(TRIM(l.email))
               THEN 0 ELSE 1
             END,
             contact_customer.created_at ASC,
             contact_customer.id ASC
           LIMIT 1
         )
       )
       WHERE l.id = ?
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      customer:
        row.customer_record_id
          ? {
              id: row.customer_record_id,
              fullName: row.customer_full_name,
              phone: row.customer_phone,
              email: row.customer_email,
              preferences: parseJson(
                row.customer_preferences,
                row.customer_preferences,
              ),
              lifetimeValue: Number(row.customer_lifetime_value || 0),
              segment: row.customer_segment,
              createdAt: toIso(row.customer_created_at),
              updatedAt: toIso(row.customer_updated_at),
            }
          : null,
      lead: {
        id: row.id,
        leadCode: row.lead_code ?? null,
        customerId: row.customer_record_id ?? null,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        source: row.source,
        platform: row.platform ?? null,
        leadType: row.lead_type ?? null,
        status: row.status,
        customStatusLabel: row.custom_status_label ?? null,
        destinationId: row.destination_id,
        destinationName: row.destination_name,
        leadCountry: row.lead_country ?? null,
        clientCurrency: row.client_currency ?? null,
        travelDate: row.travel_date,
        travelEndDate: row.travel_end_date ?? null,
        adultsCount: Number(row.adults_count || 0),
        childrenCount: Number(row.children_count || 0),
        budget: row.budget === null ? null : Number(row.budget),
        assignedTo: row.assigned_to,
        metaLeadId: row.meta_lead_id ?? null,
        campaignName: row.campaign_name ?? null,
        adName: row.ad_name ?? null,
        dynamicFields: parseJson(row.dynamic_fields, {}),
        isDeleted: Boolean(row.is_deleted),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      },
    };
  }

  async function findCustomer(id) {
    const result = await db.query(
      `SELECT id, full_name, phone, email, preferences, lifetime_value, segment,
              is_deleted, created_at, updated_at
       FROM customers
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      preferences: parseJson(row.preferences, row.preferences),
      lifetimeValue: Number(row.lifetime_value || 0),
      segment: row.segment,
      isDeleted: Boolean(row.is_deleted),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    };
  }

  async function findBookingAggregate(id) {
    const bookingResult = await db.query(
      `SELECT
         b.*,
         q.id AS quotation_record_id,
         q.quote_number,
         q.status AS quotation_status,
         q.final_price AS quotation_final_price,
         q.lead_id
       FROM bookings b
       INNER JOIN quotations q ON BINARY q.id = BINARY b.quotation_id
       WHERE b.id = ?
       LIMIT 1`,
      [id],
    );
    const booking = bookingResult.rows[0];
    if (!booking) return null;

    const [leadAggregate, paymentsResult, refundsResult] = await Promise.all([
      findLeadAggregate(booking.lead_id),
      db.query(
        `SELECT id, booking_id, amount, currency, payment_mode,
                payment_reference, proof_url, invoice_url, status, is_verified,
                verified_at, paid_at, notes, created_at, updated_at
         FROM payments
         WHERE booking_id = ?
         ORDER BY created_at ASC, id ASC`,
        [id],
      ),
      db.query(
        `SELECT id, booking_id, payment_id, refund_amount, gateway_refund_id,
                proof_url, notes, supplier_penalty, service_charge, status,
                approved_at, rejected_at, rejected_reason, processed_at,
                created_at, updated_at
         FROM refunds
         WHERE booking_id = ?
         ORDER BY created_at ASC, id ASC`,
        [id],
      ),
    ]);
    const paymentCurrencyById = new Map(
      paymentsResult.rows.map((row) => [String(row.id), row.currency]),
    );
    const bookingCurrency = leadAggregate?.lead?.clientCurrency ?? null;

    return {
      ...leadAggregate,
      quotation: {
        id: booking.quotation_record_id,
        quoteNumber: booking.quote_number ?? null,
        status: booking.quotation_status,
        finalPrice:
          booking.quotation_final_price === null
            ? null
            : Number(booking.quotation_final_price),
        currency: bookingCurrency,
      },
      booking: {
        id: booking.id,
        quotationId: booking.quotation_id,
        leadId: booking.lead_id,
        bookingNumber: booking.booking_number,
        travelStartDate: booking.travel_start_date,
        travelEndDate: booking.travel_end_date,
        totalAmount: Number(booking.total_amount || 0),
        costAmount: Number(booking.cost_amount || 0),
        profitAmount: Number(booking.profit_amount || 0),
        currency: bookingCurrency,
        status: booking.status,
        paymentStatus: booking.payment_status,
        advanceRequired: Number(booking.advance_required || 0),
        advanceReceived: Number(booking.advance_received || 0),
        cancellationReason: booking.cancellation_reason ?? null,
        cancelledAt: toIso(booking.cancelled_at),
        isDeleted: false,
        createdAt: toIso(booking.created_at),
        updatedAt: toIso(booking.updated_at),
      },
      payments: paymentsResult.rows.map((row) => ({
        id: row.id,
        bookingId: row.booking_id,
        amount: Number(row.amount || 0),
        currency: row.currency,
        paymentMode: row.payment_mode,
        paymentReference: row.payment_reference,
        proofUrl: row.proof_url,
        invoiceUrl: row.invoice_url,
        status: row.status,
        isVerified: Boolean(row.is_verified),
        verifiedAt: toIso(row.verified_at),
        paidAt: toIso(row.paid_at),
        notes: row.notes,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      })),
      refunds: refundsResult.rows.map((row) => ({
        id: row.id,
        bookingId: row.booking_id,
        paymentId: row.payment_id,
        refundAmount: Number(row.refund_amount || 0),
        currency:
          paymentCurrencyById.get(String(row.payment_id || "")) ??
          bookingCurrency,
        gatewayRefundId: row.gateway_refund_id,
        proofUrl: row.proof_url,
        notes: row.notes,
        supplierPenalty: Number(row.supplier_penalty || 0),
        serviceCharge: Number(row.service_charge || 0),
        status: row.status,
        approvedAt: toIso(row.approved_at),
        rejectedAt: toIso(row.rejected_at),
        rejectedReason: row.rejected_reason,
        processedAt: toIso(row.processed_at),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      })),
    };
  }

  async function listChanges({
    afterEpoch,
    afterEntity,
    afterId,
    limit,
    entities,
  }) {
    const enabled = new Set(entities);
    const clauses = [];
    const params = [];

    function add(entity, sql) {
      if (!enabled.has(entity)) return;
      clauses.push(sql);
      params.push(afterEpoch, afterEpoch, afterEntity, afterEntity, afterId);
    }

    add(
      "customer",
      `SELECT 'customer' AS entity_type, c.id AS entity_id, NULL AS root_booking_id,
              COALESCE(c.is_deleted, 0) AS is_deleted,
              COALESCE(c.updated_at, c.created_at) AS changed_at,
              UNIX_TIMESTAMP(COALESCE(c.updated_at, c.created_at)) AS changed_epoch
       FROM customers c
       WHERE (UNIX_TIMESTAMP(COALESCE(c.updated_at, c.created_at)) > ? OR
             (UNIX_TIMESTAMP(COALESCE(c.updated_at, c.created_at)) = ? AND
              ('customer' > ? OR ('customer' = ? AND c.id > ?))))`,
    );
    add(
      "lead",
      `SELECT 'lead' AS entity_type, l.id AS entity_id, NULL AS root_booking_id,
              COALESCE(l.is_deleted, 0) AS is_deleted, l.updated_at AS changed_at,
              UNIX_TIMESTAMP(l.updated_at) AS changed_epoch
       FROM leads l
       WHERE (UNIX_TIMESTAMP(l.updated_at) > ? OR
             (UNIX_TIMESTAMP(l.updated_at) = ? AND
              ('lead' > ? OR ('lead' = ? AND l.id > ?))))`,
    );
    add(
      "booking",
      `SELECT 'booking' AS entity_type, b.id AS entity_id, b.id AS root_booking_id,
              0 AS is_deleted, b.updated_at AS changed_at,
              UNIX_TIMESTAMP(b.updated_at) AS changed_epoch
       FROM bookings b
       WHERE (UNIX_TIMESTAMP(b.updated_at) > ? OR
             (UNIX_TIMESTAMP(b.updated_at) = ? AND
              ('booking' > ? OR ('booking' = ? AND b.id > ?))))`,
    );
    add(
      "payment",
      `SELECT 'payment' AS entity_type, p.id AS entity_id, p.booking_id AS root_booking_id,
              0 AS is_deleted, p.updated_at AS changed_at,
              UNIX_TIMESTAMP(p.updated_at) AS changed_epoch
       FROM payments p
       WHERE (UNIX_TIMESTAMP(p.updated_at) > ? OR
             (UNIX_TIMESTAMP(p.updated_at) = ? AND
              ('payment' > ? OR ('payment' = ? AND p.id > ?))))`,
    );
    add(
      "refund",
      `SELECT 'refund' AS entity_type, r.id AS entity_id, r.booking_id AS root_booking_id,
              0 AS is_deleted, COALESCE(r.updated_at, r.created_at) AS changed_at,
              UNIX_TIMESTAMP(COALESCE(r.updated_at, r.created_at)) AS changed_epoch
       FROM refunds r
       WHERE (UNIX_TIMESTAMP(COALESCE(r.updated_at, r.created_at)) > ? OR
             (UNIX_TIMESTAMP(COALESCE(r.updated_at, r.created_at)) = ? AND
              ('refund' > ? OR ('refund' = ? AND r.id > ?))))`,
    );

    if (!clauses.length) return [];
    const result = await db.query(
      `SELECT entity_type, entity_id, root_booking_id, is_deleted, changed_at, changed_epoch
       FROM (${clauses.join(" UNION ALL ")}) changes
       ORDER BY changed_epoch ASC, entity_type ASC, entity_id ASC
       LIMIT ?`,
      [...params, limit],
    );
    return result.rows;
  }

  async function createWebhookEndpoint(payload) {
    const row = await db.insert("integration_webhook_endpoints", payload);
    return row;
  }

  async function listWebhookEndpoints(clientId) {
    const result = await db.query(
      `SELECT id, client_id, name, webhook_url, subscribed_events, is_active,
              created_at, updated_at
       FROM integration_webhook_endpoints
       WHERE client_id = ?
       ORDER BY created_at DESC`,
      [clientId],
    );
    return result.rows;
  }

  async function getWebhookDiagnostics(clientId) {
    const [endpointResult, globalResult] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) AS endpoint_count,
           SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_count,
           SUM(
             CASE
               WHEN is_active = TRUE
                AND (
                  JSON_CONTAINS(subscribed_events, JSON_QUOTE('*'))
                  OR JSON_LENGTH(subscribed_events) > 0
                )
               THEN 1 ELSE 0
             END
           ) AS subscribed_count
         FROM integration_webhook_endpoints
         WHERE client_id = ?`,
        [clientId],
      ),
      db.query(
        `SELECT COUNT(*) AS delivery_count,
                MAX(created_at) AS last_delivery_created_at
         FROM integration_webhook_deliveries`,
      ),
    ]);
    const row = endpointResult.rows[0] || {};
    const global = globalResult.rows[0] || {};
    return {
      endpointCount: Number(row.endpoint_count || 0),
      activeCount: Number(row.active_count || 0),
      subscribedCount: Number(row.subscribed_count || 0),
      globalDeliveryCount: Number(global.delivery_count || 0),
      lastDeliveryCreatedAt: global.last_delivery_created_at || null,
    };
  }

  async function findWebhookEndpoint(clientId, endpointId) {
    const result = await db.query(
      `SELECT *
       FROM integration_webhook_endpoints
       WHERE id = ? AND client_id = ?
       LIMIT 1`,
      [endpointId, clientId],
    );
    return result.rows[0] || null;
  }

  async function updateWebhookEndpoint(clientId, endpointId, patch) {
    const endpoint = await findWebhookEndpoint(clientId, endpointId);
    if (!endpoint) return null;
    await db.update("integration_webhook_endpoints", endpointId, patch);
    return findWebhookEndpoint(clientId, endpointId);
  }

  async function enqueueWebhookEvent(event) {
    const payload = JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      rootBookingId: event.rootBookingId,
      operation: "UPSERT",
      occurredAt: event.occurredAt,
      resourceUrl:
        event.rootBookingId
          ? `/api/integrations/v1/bookings/${event.rootBookingId}`
          : `/api/integrations/v1/leads/${event.entityId}`,
    });

    const result = await db.query(
      `INSERT IGNORE INTO integration_webhook_deliveries
         (id, event_id, endpoint_id, event_type, entity_type, entity_id,
          root_booking_id, payload, status, attempts, next_attempt_at)
       SELECT UUID(), ?, endpoint.id, ?, ?, ?, ?, ?, 'PENDING', 0, CURRENT_TIMESTAMP
       FROM integration_webhook_endpoints endpoint
       WHERE endpoint.is_active = TRUE
         AND (
           JSON_CONTAINS(endpoint.subscribed_events, JSON_QUOTE(?))
           OR JSON_CONTAINS(endpoint.subscribed_events, JSON_QUOTE('*'))
         )`,
      [
        event.eventId,
        event.eventType,
        event.entityType,
        event.entityId,
        event.rootBookingId,
        payload,
        event.eventType,
      ],
    );
    return Number(result.rowCount || 0);
  }

  async function claimPendingDeliveries(limit = 20) {
    const result = await db.query(
      `SELECT delivery.*, endpoint.client_id, endpoint.webhook_url,
              endpoint.signing_secret_encrypted
       FROM integration_webhook_deliveries delivery
       INNER JOIN integration_webhook_endpoints endpoint
         ON endpoint.id = delivery.endpoint_id
       WHERE endpoint.is_active = TRUE
         AND (
           (
             delivery.status IN ('PENDING', 'FAILED')
             AND delivery.next_attempt_at <= CURRENT_TIMESTAMP
           )
           OR (
             delivery.status = 'PROCESSING'
             AND delivery.last_attempt_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)
           )
         )
       ORDER BY delivery.next_attempt_at ASC, delivery.created_at ASC
       LIMIT ?`,
      [limit],
    );

    const claimed = [];
    for (const row of result.rows) {
      const claim = await db.query(
        `UPDATE integration_webhook_deliveries
         SET status = 'PROCESSING', last_attempt_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND (
             (
               status IN ('PENDING', 'FAILED')
               AND next_attempt_at <= CURRENT_TIMESTAMP
             )
             OR (
               status = 'PROCESSING'
               AND last_attempt_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)
             )
           )`,
        [row.id],
      );
      if (Number(claim.rowCount || 0) > 0) claimed.push(row);
    }
    return claimed;
  }

  async function markDeliveryDelivered(id, httpStatus) {
    await db.query(
      `UPDATE integration_webhook_deliveries
       SET status = 'DELIVERED', attempts = attempts + 1,
           delivered_at = CURRENT_TIMESTAMP, last_http_status = ?,
           last_error = NULL
       WHERE id = ?`,
      [httpStatus, id],
    );
  }

  async function markDeliveryFailed(id, { httpStatus, error, retrySeconds }) {
    await db.query(
      `UPDATE integration_webhook_deliveries
       SET status = 'FAILED', attempts = attempts + 1,
           next_attempt_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND),
           last_http_status = ?, last_error = ?
       WHERE id = ?`,
      [retrySeconds, httpStatus, String(error || "").slice(0, 4000), id],
    );
  }

  async function listWebhookDeliveries(clientId, { page, limit, status }) {
    const offset = (page - 1) * limit;
    const statusClause = status ? " AND delivery.status = ?" : "";
    const params = status ? [clientId, status] : [clientId];
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT delivery.id, delivery.event_id, delivery.endpoint_id,
                delivery.event_type, delivery.entity_type, delivery.entity_id,
                delivery.root_booking_id, delivery.status, delivery.attempts,
                delivery.next_attempt_at, delivery.delivered_at,
                delivery.last_attempt_at, delivery.last_http_status,
                delivery.last_error, delivery.created_at, delivery.updated_at
         FROM integration_webhook_deliveries delivery
         INNER JOIN integration_webhook_endpoints endpoint
           ON endpoint.id = delivery.endpoint_id
         WHERE endpoint.client_id = ?${statusClause}
         ORDER BY delivery.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM integration_webhook_deliveries delivery
         INNER JOIN integration_webhook_endpoints endpoint
           ON endpoint.id = delivery.endpoint_id
         WHERE endpoint.client_id = ?${statusClause}`,
        params,
      ),
    ]);
    return {
      rows: rows.rows,
      total: Number(count.rows[0]?.total || 0),
    };
  }

  async function retryWebhookDelivery(clientId, deliveryId) {
    const result = await db.query(
      `UPDATE integration_webhook_deliveries delivery
       INNER JOIN integration_webhook_endpoints endpoint
         ON endpoint.id = delivery.endpoint_id
       SET delivery.status = 'PENDING',
           delivery.next_attempt_at = CURRENT_TIMESTAMP,
           delivery.last_error = NULL
       WHERE delivery.id = ? AND endpoint.client_id = ?`,
      [deliveryId, clientId],
    );
    return Number(result.rowCount || 0) > 0;
  }

  async function enqueueTestWebhookEvent(clientId, event) {
    const result = await db.query(
      `INSERT IGNORE INTO integration_webhook_deliveries
         (id, event_id, endpoint_id, event_type, entity_type, entity_id,
          root_booking_id, payload, status, attempts, next_attempt_at)
       SELECT UUID(), ?, endpoint.id, ?, ?, ?, ?, ?, 'PENDING', 0, CURRENT_TIMESTAMP
       FROM integration_webhook_endpoints endpoint
       WHERE endpoint.client_id = ?
         AND endpoint.is_active = TRUE`,
      [
        event.eventId,
        event.eventType,
        event.entityType,
        event.entityId,
        event.rootBookingId,
        JSON.stringify(event.payload),
        clientId,
      ],
    );
    return Number(result.rowCount || 0);
  }

  return Object.freeze({
    findCustomer,
    findLeadAggregate,
    findBookingAggregate,
    listChanges,
    createWebhookEndpoint,
    listWebhookEndpoints,
    getWebhookDiagnostics,
    findWebhookEndpoint,
    updateWebhookEndpoint,
    enqueueWebhookEvent,
    claimPendingDeliveries,
    markDeliveryDelivered,
    markDeliveryFailed,
    listWebhookDeliveries,
    retryWebhookDelivery,
    enqueueTestWebhookEvent,
  });
}

export { createPartnerIntegrationRepository };
