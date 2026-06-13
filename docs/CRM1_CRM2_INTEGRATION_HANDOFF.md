# CRM-1 to CRM-2 Integration Handoff

## 1. Integration Goal

CRM-1 remains source system.

CRM-2 receives synchronized records.

CRM-2 remains independently operational.

Synchronization covers:

- Leads
- Customers
- Quotations
- Bookings
- Payments
- Refunds

## 2. System Ownership

| System | Owner | Responsibility |
|---|---|---|
| CRM-1 | Get2Vacations developer | Generate events and expose aggregate APIs |
| CRM-2 | Client CRM developer | Receive events and save synchronized data |

CRM-1 pushes event notifications.

CRM-2 fetches complete record details.

## 3. Connection URLs

### Production URLs

CRM-1 API base URL:

```text
https://api.get2vacations.com
```

CRM-1 integration base URL:

```text
https://api.get2vacations.com/api/integrations/v1
```

CRM-2 webhook receiver URL:

```text
https://<client-crm-domain>/api/webhooks/get2vacations
```

CRM-2 developer must provide actual domain.

### Local Development URLs

CRM-1:

```text
http://localhost:3000
```

CRM-2:

```text
http://localhost:4000/api/webhooks/get2vacations
```

## 4. Complete Data Flow

```text
User creates payment in CRM-1
  -> CRM-1 creates payment.created event
  -> CRM-1 queues durable delivery
  -> CRM-1 POSTs signed webhook
  -> CRM-2 verifies signature
  -> CRM-2 reads resourceUrl
  -> CRM-2 GETs complete booking aggregate
  -> CRM-2 upserts all records
  -> CRM-2 commits transaction
  -> CRM-2 returns HTTP 200
  -> CRM-1 marks delivery DELIVERED
```

Same flow applies for:

```text
lead.created
lead.updated
booking.created
booking.updated
payment.created
payment.updated
refund.created
refund.updated
```

## 5. CRM-1 Developer Tasks

### 5.1 Apply Database Migrations

```powershell
cd backend


### 5.2 Create Client Credentials

```powershell
cd backend
npm run integration:create-client -- "Client CRM"
```

Example output:

```json
{
  "clientId": "68be0f5a-5f79-43cb-b778-example",
  "apiKey": "g2v_generated_secret"
}
```

CRM-1 developer securely shares:

```text
G2V_CLIENT_ID
G2V_API_KEY
G2V_API_BASE_URL
```

Never send credentials publicly.

### 5.3 Confirm Required Scopes

Client requires:

```text
changes:read
customers:read
leads:read
bookings:read
webhooks:manage
deliveries:read
deliveries:retry
```

### 5.4 Register CRM-2 Webhook

Request:

```http
POST https://api.get2vacations.com/api/integrations/v1/webhook-endpoints
X-Client-Id: <client-id>
X-API-Key: <api-key>
Content-Type: application/json
```

Body:

```json
{
  "name": "Client CRM Production",
  "webhookUrl": "https://<client-crm-domain>/api/webhooks/get2vacations",
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

Response returns:

```text
webhook endpoint ID
webhook signing secret
```

Share signing secret securely.

Signing secret returns once.

### 5.5 Test CRM-2 Receiver

```http
POST https://api.get2vacations.com/api/integrations/v1/webhook-endpoints/<endpoint-id>/test
X-Client-Id: <client-id>
X-API-Key: <api-key>
```

Expected response:

```json
{
  "success": true,
  "data": {
    "delivered": true,
    "httpStatus": 200,
    "eventId": "event-uuid"
  }
}
```

### 5.6 Monitor Failed Deliveries

```http
GET https://api.get2vacations.com/api/integrations/v1/webhook-deliveries?status=FAILED
X-Client-Id: <client-id>
X-API-Key: <api-key>
```

Retry failed delivery:

```http
POST https://api.get2vacations.com/api/integrations/v1/webhook-deliveries/<delivery-id>/retry
X-Client-Id: <client-id>
X-API-Key: <api-key>
```

## 6. CRM-2 Developer Tasks

### 6.1 Provide Receiver URL

CRM-2 developer provides:

```text
https://<client-crm-domain>/api/webhooks/get2vacations
```

Requirements:

- Publicly reachable
- HTTPS enabled
- Accepts POST requests
- Returns response within ten seconds

### 6.2 Configure Environment

```env
G2V_API_BASE_URL=https://api.get2vacations.com
G2V_CLIENT_ID=<provided-client-id>
G2V_API_KEY=<provided-api-key>
G2V_WEBHOOK_SECRET=<provided-signing-secret>
```

### 6.3 Create Receiver Route

Required full route:

```http
POST https://<client-crm-domain>/api/webhooks/get2vacations
```

Incoming headers:

```http
X-Webhook-Id: <event-id>
X-Webhook-Timestamp: <unix-seconds>
X-Webhook-Signature: <hmac-sha256-signature>
Content-Type: application/json
```

Incoming body:

```json
{
  "eventId": "event-uuid",
  "eventType": "payment.created",
  "entityType": "payment",
  "entityId": "payment-uuid",
  "rootBookingId": "booking-uuid",
  "operation": "UPSERT",
  "occurredAt": "2026-06-13T10:00:00.000Z",
  "resourceUrl": "/api/integrations/v1/bookings/booking-uuid"
}
```

### 6.4 Verify Webhook Signature

Signature source:

```text
<X-Webhook-Timestamp>.<raw-request-body>
```

Algorithm:

```text
HMAC-SHA256
```

Secret:

```text
G2V_WEBHOOK_SECRET
```

Reject:

- Invalid signature
- Missing signature
- Timestamp older than five minutes

### 6.5 Fetch Complete Aggregate

Webhook only contains event notification.

Fetch complete details using `resourceUrl`.

Example:

```http
GET https://api.get2vacations.com/api/integrations/v1/bookings/booking-uuid
X-Client-Id: <client-id>
X-API-Key: <api-key>
X-Request-Id: <unique-request-id>
```

Aggregate contains:

```text
customer
lead
quotation
booking
payments
refunds
```

### 6.6 Save Source IDs

CRM-1 response IDs become CRM-2 source IDs:

| CRM-2 Column | CRM-1 Response |
|---|---|
| `source_customer_id` | `data.customer.id` |
| `source_lead_id` | `data.lead.id` |
| `source_quotation_id` | `data.quotation.id` |
| `source_booking_id` | `data.booking.id` |
| `source_payment_id` | `data.payments[].id` |
| `source_refund_id` | `data.refunds[].id` |

Example mapping:

```js
source_customer_id = aggregate.customer?.id ?? null;
source_lead_id = aggregate.lead.id;
source_quotation_id = aggregate.quotation.id;
source_booking_id = aggregate.booking.id;
source_payment_id = payment.id;
source_refund_id = refund.id;
```

These fields belong inside CRM-2.

CRM-1 does not rename IDs.

### 6.7 Add Unique Constraints

CRM-2 must prevent duplicates:

```sql
CREATE UNIQUE INDEX uq_customer_source_id
  ON customers(source_customer_id);

CREATE UNIQUE INDEX uq_lead_source_id
  ON leads(source_lead_id);

CREATE UNIQUE INDEX uq_quotation_source_id
  ON quotations(source_quotation_id);

CREATE UNIQUE INDEX uq_booking_source_id
  ON bookings(source_booking_id);

CREATE UNIQUE INDEX uq_payment_source_id
  ON payments(source_payment_id);

CREATE UNIQUE INDEX uq_refund_source_id
  ON refunds(source_refund_id);
```

Adapt names to CRM-2 schema.

### 6.8 Add Event Idempotency

```sql
CREATE TABLE integration_processed_events (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  processed_at DATETIME NOT NULL
);
```

Same event can arrive repeatedly.

Duplicate event must return `200`.

### 6.9 Save Transactionally

Required upsert order:

```text
customer
lead
quotation
booking
payments
refunds
processed event
```

Use one database transaction.

When customer is null:

```text
Keep source_customer_id null.
Do not create fake customer.
```

### 6.10 Return Success

Return after successful commit:

```http
HTTP 200
```

```json
{
  "success": true
}
```

CRM-1 retries non-`2xx` responses.

## 7. API Reference

### Health Check

```http
GET https://api.get2vacations.com/api/integrations/v1/health
```

Purpose:

```text
Validate credentials and connectivity.
```

### Booking Aggregate

```http
GET https://api.get2vacations.com/api/integrations/v1/bookings/<booking-id>
```

Purpose:

```text
Fetch complete booking synchronization data.
```

### Initial Recovery Changes

```http
GET https://api.get2vacations.com/api/integrations/v1/changes?limit=100&entities=lead,booking,payment,refund
```

Purpose:

```text
Recover events possibly missed earlier.
```

### Next Recovery Changes

```http
GET https://api.get2vacations.com/api/integrations/v1/changes?cursor=<cursor>&limit=100&entities=lead,booking,payment,refund
```

Purpose:

```text
Continue recovery from saved position.
```

## 8. Responsibility Matrix

| Work | CRM-1 | CRM-2 |
|---|---:|---:|
| Generate integration credentials | Yes | No |
| Securely store provided credentials | Yes | Yes |
| Generate webhook events | Yes | No |
| Retry failed deliveries | Yes | No |
| Expose aggregate API | Yes | No |
| Provide public webhook URL | No | Yes |
| Verify webhook signature | No | Yes |
| Fetch aggregate API | No | Yes |
| Store source IDs | No | Yes |
| Prevent duplicate records | No | Yes |
| Return HTTP 200 after commit | No | Yes |
| Monitor synchronization | Yes | Yes |

## 9. End-to-End Testing

### Phase 1: Connectivity

1. CRM-2 starts receiver.
2. CRM-2 shares receiver URL.
3. CRM-1 registers webhook.
4. CRM-1 sends test webhook.
5. CRM-2 returns HTTP 200.

### Phase 2: Booking Sync

1. Create booking CRM-1.
2. Confirm webhook delivery.
3. Confirm booking CRM-2.
4. Confirm source IDs saved.

### Phase 3: Payment Sync

1. Create payment CRM-1.
2. Confirm payment CRM-2.
3. Confirm booking totals update.
4. Confirm no duplicate payment.

### Phase 4: Refund Sync

1. Create refund CRM-1.
2. Confirm refund CRM-2.
3. Confirm payment relationship.
4. Confirm no duplicate refund.

### Phase 5: Retry Test

1. Stop CRM-2 receiver.
2. Create payment CRM-1.
3. Confirm FAILED delivery.
4. Start CRM-2 receiver.
5. Retry delivery CRM-1.
6. Confirm DELIVERED status.

## 10. Go-Live Checklist

### CRM-1 Checklist

- Production migrations applied.
- Client credentials generated.
- Required scopes configured.
- CRM-2 HTTPS webhook registered.
- Immediate webhook test succeeds.
- Failed-delivery monitoring enabled.

### CRM-2 Checklist

- Production receiver route deployed.
- HTTPS certificate valid.
- Signature verification enabled.
- Timestamp validation enabled.
- API credentials secured.
- Source ID indexes added.
- Idempotency table added.
- Transactional upsert enabled.
- Duplicate event test passes.
- Booking/payment/refund tests pass.

## 11. Troubleshooting

### `fetch failed`

```text
CRM-2 URL unreachable.
Check server, port, DNS, firewall.
```

### `Route not found: POST /api/webhooks/get2vacations`

```text
CRM-2 receiver route missing.
Create route and restart CRM-2.
```

### `INTEGRATION_AUTH_REQUIRED`

```text
X-Client-Id or X-API-Key missing.
```

### `INTEGRATION_SCOPE_FORBIDDEN`

```text
Integration client lacks required scope.
```

### Empty Webhook Deliveries

```text
No subscribed business event occurred.
```

### Duplicate CRM-2 Records

```text
Source ID unique indexes missing.
Idempotency handling missing.
```

## 12. Related Files

```text
docs/PARTNER_CRM_INTEGRATION.md
docs/PARTNER_CRM_WEBHOOK_IMPLEMENTATION.md
postman/Partner-CRM-Integration.postman_collection.json
postman/Partner-CRM-Integration.postman_environment.json
```
