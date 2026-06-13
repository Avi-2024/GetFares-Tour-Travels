# Partner CRM Integration

Implementation guide:

```text
docs/PARTNER_CRM_WEBHOOK_IMPLEMENTATION.md
```

Developer handoff guide:

```text
docs/CRM1_CRM2_INTEGRATION_HANDOFF.md
```

## Purpose

This integration sends CRM-1 changes into CRM-2.

CRM-2 remains independently usable.

Supported entities:

- Leads
- Customers
- Bookings
- Payments
- Refunds

## Architecture

```text
CRM-1 business action
  -> domain event
  -> durable webhook delivery
  -> signed POST request
  -> CRM-2 receiver
  -> fetch complete aggregate
  -> transactional upsert
  -> HTTP 200
```

The change feed provides recovery support.

## Setup

Create integration credentials:

```powershell
npm run integration:create-client -- "Client CRM"
```

Save returned credentials securely:

```json
{
  "clientId": "uuid",
  "apiKey": "g2v_secret"
}
```

The API key returns once.

## Authentication

Every request requires:

```http
X-Client-Id: <client-id>
X-API-Key: <api-key>
X-Request-Id: <unique-request-id>
```

Rate limit:

```text
300 requests per minute per client
```

## Required Scopes

| Scope | Access |
|---|---|
| `changes:read` | Read recovery change feed |
| `customers:read` | Read customer aggregate |
| `leads:read` | Read lead aggregate |
| `bookings:read` | Read booking aggregate |
| `webhooks:manage` | Manage webhook endpoints |
| `deliveries:read` | Inspect deliveries |
| `deliveries:retry` | Retry failed deliveries |

## API Endpoints

Base path:

```text
/api/integrations/v1
```

| Method | Endpoint | Scope |
|---|---|---|
| `GET` | `/health` | Authenticated client |
| `GET` | `/changes` | `changes:read` |
| `GET` | `/customers/:id` | `customers:read` |
| `GET` | `/leads/:id` | `leads:read` |
| `GET` | `/bookings/:id` | `bookings:read` |
| `GET` | `/webhook-endpoints` | `webhooks:manage` |
| `POST` | `/webhook-endpoints` | `webhooks:manage` |
| `PATCH` | `/webhook-endpoints/:id` | `webhooks:manage` |
| `POST` | `/webhook-endpoints/:id/test` | `webhooks:manage` |
| `GET` | `/webhook-deliveries` | `deliveries:read` |
| `POST` | `/webhook-deliveries/:id/retry` | `deliveries:retry` |
| `POST` | `/webhook-deliveries/diagnostic` | `webhooks:manage` |

## Register Webhook

```http
POST /api/integrations/v1/webhook-endpoints
Content-Type: application/json
```

```json
{
  "name": "Client CRM Production",
  "webhookUrl": "https://client-crm.example.com/api/webhooks/get2vacations",
  "subscribedEvents": [
    "lead.created",
    "lead.updated",
    "booking.created",
    "booking.updated",
    "payment.created",
    "payment.updated",
    "refund.created",
    "refund.updated"
  ],
  "isActive": true
}
```

Save returned `signingSecret`.

It returns only once.

Production webhook URLs require HTTPS.


## Delivery Processing

Webhook worker runs every five seconds.

Retry delays:

```text
5 seconds
30 seconds
2 minutes
10 minutes
1 hour
```

Delivery statuses:

```text
PENDING
PROCESSING
DELIVERED
FAILED
```

HTTP `2xx` marks delivery successful.

Other responses trigger retries.

## Change Feed Recovery

Request:

```http
GET /api/integrations/v1/changes?limit=100&entities=booking,payment,refund
```

Continue using returned cursor:

```http
GET /api/integrations/v1/changes?cursor=<nextCursor>&limit=100
```

Rules:

1. Process changes in response order.
2. Fetch each returned `resourceUrl`.
3. Upsert complete aggregate transactionally.
4. Save cursor after successful batch.
5. Continue while `hasMore` is true.

Never save cursor before successful processing.

## Aggregate Strategy

Booking aggregate contains:

- Customer
- Lead
- Quotation summary
- Booking
- Payments
- Refunds

CRM-2 should upsert using source IDs.

Recommended unique keys:

```text
source_customer_id
source_lead_id
source_booking_id
source_payment_id
source_refund_id
source_event_id
```

## Failure Diagnosis

`404 Route not found`:

```text
Client receiver route is missing.
```

`fetch failed`:

```text
Client receiver is unreachable.
```

`INTEGRATION_SCOPE_FORBIDDEN`:

```text
Integration client lacks required scope.
```

Empty delivery list:

```text
No subscribed event occurred yet.
```

## Production Checklist

- Use HTTPS receiver URL.
- Store secrets outside source control.
- Verify webhook signatures.
- Reject stale timestamps.
- Enforce event idempotency.
- Use database transactions.
- Return HTTP 200 after commit.
- Monitor failed deliveries.
- Run scheduled recovery polling.
- Keep source IDs unique.
