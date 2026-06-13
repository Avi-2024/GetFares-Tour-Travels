# Partner CRM Webhook Implementation

## Objective

CRM-1 sends booking-related changes.

CRM-2 receives and saves them.

CRM-2 remains independently usable.

## Data Flow

```text
CRM-1 booking/payment/refund action
  -> webhook event queued
  -> signed webhook sent
  -> CRM-2 verifies signature
  -> CRM-2 fetches booking aggregate
  -> CRM-2 saves aggregate transactionally
  -> CRM-2 returns HTTP 200
```

## Required CRM-2 Route

CRM-2 must expose:

```http
POST /api/webhooks/get2vacations
```

Current `404 Route not found` means:

```text
CRM-2 route does not exist.
```

## Required Environment Variables

Add inside CRM-2:

```env
G2V_API_BASE_URL=https://api.get2vacations.com
G2V_CLIENT_ID=<integration-client-id>
G2V_API_KEY=<integration-api-key>
G2V_WEBHOOK_SECRET=<webhook-signing-secret>
```

Purpose:

| Variable | Purpose |
|---|---|
| `G2V_API_BASE_URL` | CRM-1 API address |
| `G2V_CLIENT_ID` | Aggregate API authentication |
| `G2V_API_KEY` | Aggregate API authentication |
| `G2V_WEBHOOK_SECRET` | Incoming signature verification |

Never expose these values publicly.

## Incoming Webhook Contract

Headers:

```http
X-Webhook-Id: <event-id>
X-Webhook-Timestamp: <unix-seconds>
X-Webhook-Signature: <hex-hmac-sha256>
Content-Type: application/json
```

Payload:

```json
{
  "eventId": "event-uuid",
  "eventType": "payment.created",
  "entityType": "payment",
  "entityId": "payment-uuid",
  "rootBookingId": "booking-uuid",
  "operation": "UPSERT",
  "occurredAt": "2026-06-12T08:25:16.000Z",
  "resourceUrl": "/api/integrations/v1/bookings/booking-uuid"
}
```

`resourceUrl` returns complete data.

## Express Route Registration

Raw body must remain available.

Register webhook route before normal JSON parser:

```js
import express from "express";
import { handleGet2VacationsWebhook } from "./integrations/get2vacations/get2vacations.controller.js";

const app = express();

app.post(
  "/api/webhooks/get2vacations",
  express.raw({ type: "application/json", limit: "1mb" }),
  handleGet2VacationsWebhook,
);

app.use(express.json({ limit: "1mb" }));
```

## Signature Verification

Create:

```text
src/integrations/get2vacations/get2vacations.signature.js
```

```js
import crypto from "node:crypto";

const MAX_TIMESTAMP_AGE_SECONDS = 300;

export function verifyWebhookSignature({
  rawBody,
  timestamp,
  signature,
  secret,
}) {
  const timestampNumber = Number(timestamp);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const age = Math.abs(currentTimestamp - timestampNumber);

  if (!Number.isFinite(timestampNumber)) return false;
  if (age > MAX_TIMESTAMP_AGE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(String(signature || ""), "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
```

## CRM-1 API Client

Create:

```text
src/integrations/get2vacations/get2vacations.client.js
```

```js
const timeoutMs = 8000;

export async function fetchBookingAggregate(resourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${process.env.G2V_API_BASE_URL}${resourceUrl}`,
      {
        headers: {
          "X-Client-Id": process.env.G2V_CLIENT_ID,
          "X-API-Key": process.env.G2V_API_KEY,
          "X-Request-Id": crypto.randomUUID(),
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`CRM-1 aggregate request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } finally {
    clearTimeout(timeout);
  }
}
```

Add missing import:

```js
import crypto from "node:crypto";
```

## Webhook Controller

Create:

```text
src/integrations/get2vacations/get2vacations.controller.js
```

```js
import { verifyWebhookSignature } from "./get2vacations.signature.js";
import { fetchBookingAggregate } from "./get2vacations.client.js";
import { syncBookingAggregate } from "./get2vacations.service.js";

export async function handleGet2VacationsWebhook(req, res) {
  const rawBody = req.body;
  const eventId = req.header("X-Webhook-Id");
  const timestamp = req.header("X-Webhook-Timestamp");
  const signature = req.header("X-Webhook-Signature");

  const valid = verifyWebhookSignature({
    rawBody,
    timestamp,
    signature,
    secret: process.env.G2V_WEBHOOK_SECRET,
  });

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  const payload = JSON.parse(rawBody.toString("utf8"));

  if (payload.eventId !== eventId) {
    return res.status(400).json({
      success: false,
      message: "Webhook event ID mismatch",
    });
  }

  if (payload.eventType === "integration.test") {
    return res.status(200).json({ success: true });
  }

  const aggregate = await fetchBookingAggregate(payload.resourceUrl);

  await syncBookingAggregate({
    event: payload,
    aggregate,
  });

  return res.status(200).json({ success: true });
}
```

Wrap controller using existing error middleware.

## Database Requirements

Create idempotency table:

```sql
CREATE TABLE integration_processed_events (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  processed_at DATETIME NOT NULL
);
```

CRM-2 tables should include source IDs:

```text
source_customer_id
source_lead_id
source_quotation_id
source_booking_id
source_payment_id
source_refund_id
```

Add unique indexes:

```sql
CREATE UNIQUE INDEX uq_customer_source_id ON customers(source_customer_id);
CREATE UNIQUE INDEX uq_lead_source_id ON leads(source_lead_id);
CREATE UNIQUE INDEX uq_booking_source_id ON bookings(source_booking_id);
CREATE UNIQUE INDEX uq_payment_source_id ON payments(source_payment_id);
CREATE UNIQUE INDEX uq_refund_source_id ON refunds(source_refund_id);
```

Adapt table names before applying.

## Transactional Sync Service

Create:

```text
src/integrations/get2vacations/get2vacations.service.js
```

Implementation rules:

```text
begin transaction
check processed event
return success when duplicate
upsert customer
upsert lead
upsert quotation
upsert booking
upsert payments
upsert refunds
insert processed event
commit transaction
```

Pseudo implementation:

```js
export async function syncBookingAggregate({ event, aggregate }) {
  return database.transaction(async (tx) => {
    const processed = await processedEventsRepository.exists(
      tx,
      event.eventId,
    );

    if (processed) return;

    await customersRepository.upsertFromSource(tx, aggregate.customer);
    await leadsRepository.upsertFromSource(tx, aggregate.lead);
    await quotationsRepository.upsertFromSource(tx, aggregate.quotation);
    await bookingsRepository.upsertFromSource(tx, aggregate.booking);

    for (const payment of aggregate.payments || []) {
      await paymentsRepository.upsertFromSource(tx, payment);
    }

    for (const refund of aggregate.refunds || []) {
      await refundsRepository.upsertFromSource(tx, refund);
    }

    await processedEventsRepository.create(tx, {
      eventId: event.eventId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event,
    });
  });
}
```

## Upsert Rules

Never match using customer names.

Never blindly create duplicates.

Match records using source IDs.

Upsert order:

```text
customer
lead
quotation
booking
payments
refunds
processed event
```

When `customer` is null:

```text
save lead and booking normally
do not create fake customer
```

## Required Success Response

After successful database commit:

```http
HTTP 200
```

```json
{
  "success": true
}
```

Duplicate event response:

```http
HTTP 200
```

```json
{
  "success": true,
  "duplicate": true
}
```

## Error Responses

| Status | Condition |
|---|---|
| `200` | Successfully committed |
| `200` | Duplicate event |
| `400` | Invalid payload |
| `401` | Invalid signature |
| `500` | Temporary processing failure |

CRM-1 retries every non-`2xx` response.

## CRM-1 Webhook Registration

Import Postman files:

```text
postman/Partner-CRM-Integration.postman_collection.json
postman/Partner-CRM-Integration.postman_environment.json
```

Set variables:

```text
baseUrl
clientId
apiKey
webhookUrl
```

Example webhook URL:

```text
https://client-crm.example.com/api/webhooks/get2vacations
```

Run requests:

```text
Health Check
Create Webhook Endpoint
Send Immediate Test
```

Save returned:

```text
webhookSigningSecret
```

Set it as CRM-2:

```env
G2V_WEBHOOK_SECRET=<webhookSigningSecret>
```

## Testing Checklist

### Connectivity

- CRM-2 route returns `200`.
- HTTPS certificate works.
- Firewall permits CRM-1.
- Test webhook returns `200`.

### Data Sync

- Create booking in CRM-1.
- Confirm booking appears CRM-2.
- Create payment in CRM-1.
- Confirm payment appears CRM-2.
- Create refund in CRM-1.
- Confirm refund appears CRM-2.

### Reliability

- Send same event twice.
- Confirm no duplicate records.
- Stop CRM-2 temporarily.
- Confirm failed delivery appears.
- Restart CRM-2.
- Retry failed delivery.
- Confirm delivery becomes `DELIVERED`.

## Troubleshooting

### Route Not Found

Error:

```text
Route not found: POST /api/webhooks/get2vacations
```

Fix:

```text
Create and register CRM-2 receiver route.
Restart CRM-2 backend.
```

### Fetch Failed

Error:

```text
fetch failed
```

Fix:

```text
Start CRM-2 backend.
Verify webhook URL and port.
Verify DNS and firewall.
```

### Invalid Signature

Fix:

```text
Use exact returned signing secret.
Verify raw request body.
Check server clock.
```

### Delivery Failed

Run:

```text
List Failed Deliveries
Retry Delivery
```

Inspect:

```text
last_http_status
last_error
attempts
next_attempt_at
```

## Production Checklist

- Public HTTPS receiver exists.
- Signing secret stored securely.
- API credentials stored securely.
- Signature verification enabled.
- Timestamp validation enabled.
- Idempotency table enabled.
- Source IDs use unique indexes.
- Aggregate sync uses transaction.
- Receiver returns after commit.
- Failed deliveries monitored.
- Recovery cursor periodically tested.
- Logs contain event IDs.
- Logs exclude secrets.
