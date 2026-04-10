# Bookings module — developer guide

**Location:** `backend/crm/modules/bookings`  
**Base URL:** `/api/bookings` (see `backend/crm/modules/index.js`)

Manages **bookings** created from **approved quotations**: money rules (advance, payment status), travel segments (hotels, flights), supplier/DMC JSON, **deadline** fields with computed **risk** and **balance due**, **status workflow**, **invoices** + optional **pending payment** row, **reminder** and **deadline alert** automation hooks via the **event bus**.  
RBAC applies: `bookings:read`, `bookings:create`, `bookings:update`.

**Main tables:** `bookings`, `quotations`, `payments`, `refunds`, `invoices`, `booking_status_history`, `booking_reminder_logs`, `booking_deadline_alert_logs`, `users` (`bookings.schema.js`).

---

## 1. High-level module overview

| Piece | Role |
|--------|------|
| **Routes** | Auth + `authorize(...)`, Zod `validateRequest`, then controller. |
| **Controller** | Maps `req.validated` + `req.context` to service; sets HTTP status. |
| **Service** | Business rules: quotation checks, advance policy, exchange rules, status transitions, deadline math, reminders, alerts, invoice generation, payment recalculation. |
| **Repository** | DB access, JSON column serialization, schema introspection (optional tables/columns), joins for stats/reminders. |
| **Events** | `bookings.*` on bus + structured logs (no email in this module). |

---

## 2. Step-by-step flow

**Route → controller → service → repository**

1. **`requireAuth`** — JWT user on `req.context`.
2. **`authorize("bookings:...")`** — permission check.
3. **`validateRequest(...)`** — query/body/params (Zod).
4. **Controller** passes filters/body/`id` and **`req.context`** (e.g. `user`, `requestId`).
5. **Service** validates domain rules, may call **`events`**, **`repository`** multiple times.
6. **Repository** runs **SELECT / INSERT / UPDATE**, maps rows to **camelCase** domain objects (and loads **creator user** + **lead id** via quotation when listing).

---

## 3. HTTP map

| Method | Path | Permission | Notes |
|--------|------|------------|--------|
| GET | `/` | `bookings:read` | List + filters |
| GET | `/stats` | `bookings:read` | Aggregate counts/revenue |
| POST | `/reminders/run` | `bookings:update` | Pre/post travel reminder batch |
| POST | `/deadlines/process` | `bookings:update` | Deadline alert batch |
| POST | `/` | `bookings:create` | Create from quotation |
| GET | `/:id/status-history` | `bookings:read` | Status audit trail |
| GET | `/:id/invoices` | `bookings:read` | Invoices for booking |
| POST | `/:id/invoices/generate` | `bookings:update` | Create invoice (+ optional pending payment) |
| POST | `/:id/status` | `bookings:update` | Status transition |
| POST | `/:id/approve` | `bookings:update` | `is_approved` flag |
| GET | `/:id` | `bookings:read` | Single booking + deadline insights |
| PATCH | `/:id` | `bookings:update` | Partial update (not primary status API) |

**Status changes** use **`POST /:id/status`**. PATCH `update` validation does **not** include `status`; service `update()` still checks `payload.status` for internal consistency.

---

## 4. Function-wise explanation

### `index.js` — `createBookingsModule`

Wires **repository**, **events**, **service**, **controller**, **router**.  
**Dependencies:** `db`, `logger`, `config`, `eventBus`, `validateRequest`, `requireAuth`, `authorize`.

### `bookings.controller.js`

| Method | Service call | Typical status |
|--------|----------------|----------------|
| `list` | `service.list(query, context)` | 200 |
| `stats` | `service.stats(context)` | 200 |
| `runTravelReminders` | `service.runTravelReminders(body, context)` | 200 |
| `processDeadlineAlerts` | `service.processDeadlineAlerts(body, context)` | 200 |
| `getById` | `service.getById(id, context)` | 200 |
| `create` | `service.create(body, context)` | 201 |
| `update` | `service.update(id, body, context)` | 200 |
| `transitionStatus` | `service.transitionStatus(id, body, context)` | 200 |
| `listStatusHistory` | `service.listStatusHistory(id, context)` | 200 |
| `generateInvoice` | `service.generateInvoice(id, body, context)` | 201 |
| `listInvoices` | `service.listInvoices(id, context)` | 200 |
| `approve` | `service.approve(id, context)` | 200 |

### `bookings.service.js` — main behaviors

**Helpers (not exported as HTTP):**

| Name | Purpose |
|------|---------|
| `toNumber`, `toUpperText`, date helpers | Safe parsing for amounts/dates. |
| `normalizeDateTime` | ISO string for deadline fields; **400** if invalid. |
| `computeDeadlineInsights` / `withDeadlineInsights` | Adds `supplierPaymentDeadlineAt`, `cancellationDeadlineAt`, `balanceDueBy`, `deadlineRiskLevel` (`SAFE`, `D2_DUE`, `DEADLINE_DUE`, `OVERDUE`), `deadlineLastEvaluatedAt`. |
| `buildBookingNumber` | `BK-<timestamp>-<random>`. |
| `buildInvoiceNumber` | `INV-...` from booking number. |
| `minimumAdvanceRequired` | Non-refundable → full total; else **50%** of total (`PAYMENT_POLICY.refundableAdvanceRatio`). |
| `ensureQuotationExists` | Quotation exists, not deleted, **status `APPROVED`**. |
| `ensureBookingNumberUnique` | **409** if duplicate number. |
| `appendStatusHistory` | Inserts row in `booking_status_history`. |
| `assertPaymentPolicyForConfirmation` | Uses repo snapshot: verified paid ≥ advance, proof present. |
| `recalculatePaymentStatus` | Sums verified payments minus processed refunds → sets `advance_received`, `payment_status`. |
| `getDeadlineAlertTypes` | Strings like `SUPPLIER_DEADLINE_DUE`, `BALANCE_D2_DUE`, overdue variants. |
| `buildCreateRecord` | Maps API payload → DB-shaped record + validations. |

**Exported service methods:**

| Method | Purpose |
|--------|---------|
| `list` | `findAll` + deadline insights per row. |
| `stats` | `repository.getStats()`. |
| `getById` | Not deleted; **404**; + insights. |
| `create` | Quotation rules + one booking per quotation + unique booking number + `create` + initial status history + `emitCreated`. |
| `update` | Field-level PATCH; **409** if exchange locked and rate change; **409** advance below minimum; deadline ordering; `emitUpdated`. If `payload.status` set (non-API path), delegates to `transitionStatus`. |
| `transitionStatus` | Validates transitions; **cannot leave CANCELLED**; CONFIRMED runs payment policy; CANCELLED needs reason; `repository.update` + history + `emitStatusChanged` + `emitUpdated`. |
| `runTravelReminders` | Finds **CONFIRMED** bookings where travel start/end matches computed dates; logs to `booking_reminder_logs`; `emitPreTravelReminder` / `emitPostTravelFeedback`. |
| `processDeadlineAlerts` | Batch: refresh deadline fields, dedupe logs per booking/type/day, `emitDeadlineAlert` + `emitUpdated`. |
| `listStatusHistory` | After `getById`, lists history. |
| `generateInvoice` | Unique invoice number; `createInvoice`; if outstanding > 0, `createPendingInvoicePayment`; `emitInvoiceGenerated`. |
| `listInvoices` | After `getById`, lists invoices. |
| `approve` | Sets `is_approved` true; **409** if already approved. |

**`recalculatePaymentStatus`** is exported for other modules (e.g. payments) to sync booking payment fields.

### `bookings.repository.js`

| Area | Purpose |
|------|---------|
| `toBooking`, `toInvoice`, `toPayment`, `toStatusHistory` | Row → domain. |
| `hasTable` / `hasColumn` / `sanitizeForTable` | Skip or filter fields if schema differs (migrations). |
| `mapListFilters` | Maps query filters to DB column names. |
| `findAll` | Loads bookings, filters deleted, sorts by `createdAt` desc; joins creator + lead via quotations. |
| `findById`, `findByQuotationId`, `findByBookingNumber` | Lookups. |
| `create` / `update` | JSON columns serialized for Postgres. |
| `getStats` | SQL aggregates or in-memory fallback. |
| `findTravelReminderCandidates` | SQL with optional anti-join on reminder logs. |
| `createReminderLog` | Insert if table exists. |
| `findDeadlineCandidates` | Active bookings with deadline fields. |
| `findDeadlineAlertLog` / `createDeadlineAlertLog` | Deduping alerts. |
| `createStatusHistory` / `listStatusHistory` | Audit trail. |
| `createInvoice`, `findInvoicesByBookingId`, `findInvoiceByNumber` | Invoices. |
| `createPendingInvoicePayment` | Pending payment for invoice balance. |
| `getPaymentPolicySnapshot`, `getVerifiedPaidAmount`, `getProcessedRefundAmount` | Payment policy + recalculation. |

### `bookings.validation.js`

- **Statuses:** booking `PENDING` \| `CONFIRMED` \| `CANCELLED`; payment `PENDING` \| `PARTIAL` \| `FULL` \| `REFUNDED`.
- **create:** `quotationId` UUID, dates, `totalAmount` / `costAmount`, nested hotel/flight/insurance/other arrays, optional deadlines; **refine:** end ≥ start, cost ≤ total.
- **update:** at least one field; optional same nested shapes.
- **transitionStatus:** `status` required; **CANCELLED** requires `cancellationReason`.

### `bookings.events.js`

| Event | When |
|-------|------|
| `bookings.created` | After create |
| `bookings.updated` | After update, approve, some alerts |
| `bookings.status_changed` | Status transition |
| `bookings.invoice_generated` | Invoice created |
| `bookings.pre_travel_reminder` | Reminder batch |
| `bookings.post_travel_feedback` | Post-travel batch |
| `bookings.deadline_alert` | Deadline processor (warn log) |

Listeners (e.g. WhatsApp, notifications) live **outside** this module.

---

## 5. Input → processing → output (summary)

| Flow | Input | Processing | Output |
|------|--------|------------|--------|
| **List** | Query filters | Filter + sort + enrich | Array of bookings + computed deadline fields |
| **Stats** | — | Aggregates | Counts + revenue + pending payment stats |
| **Create** | Quotation id, amounts, segments, deadlines | Quotation APPROVED, one booking/quotation, advance rules, currencies/exchange | Booking + JWT not here — just booking object |
| **Get by id** | UUID | Not deleted | Booking + insights |
| **Patch** | Partial fields | Locks, advance min, dates, deadlines | Updated booking |
| **Transition status** | `status`, optional reason | Payment policy for CONFIRMED; lock cancelled | Updated booking + history |
| **Reminders** | Optional reference date, day offsets | Find candidates, log, emit | Counts + booking ids |
| **Deadline alerts** | Optional time, lookahead, limit | Update risk, log once per type/day, emit | Summary object |
| **Generate invoice** | Optional invoice number, pdf URL | Insert invoice; maybe pending payment | Invoice + linked payment summary |
| **Approve** | — | Set `isApproved` | Booking |

---

## 6. Business logic (simple terms)

- Bookings come only from **approved** quotations; **one active booking per quotation**.
- **Advance:** refundable bookings need at least **half** of selling price as advance (unless non-refundable — then full amount). Requested advance cannot exceed total.
- **Selling vs cost:** Client price (`totalAmount`) should be ≥ **cost** (`costAmount`).
- **Currencies:** If client and supplier currencies differ, an **exchange rate** is required before rates are meaningful; **locking** the rate forbids changing it later unless business allows unlock path (here: lock blocks edits).
- **Confirming** a booking checks **payments**: verified money received must meet **advance** and there must be **payment proof** (URL, gateway id, or reference).
- **Payment status** on the booking is derived from **verified payments** minus **processed refunds**.
- **Deadlines:** System computes whether supplier payment is overdue, due soon, or balance “D-2” style window; **automated jobs** can emit events for ops/WhatsApp — **this module does not send messages itself**.
- **Reminders:** Pre-travel = bookings whose **start date** hits a target day; post-travel = **end date**; only **CONFIRMED**, not deleted, and (when logs table exists) not already logged for that type/date.

---

## 7. Database operations

| Operation | Tables (typical) |
|-----------|-------------------|
| **SELECT** | `bookings`, `quotations`, `users`, `payments`, `refunds`, `invoices`, `booking_status_history`, `booking_reminder_logs`, `booking_deadline_alert_logs`, `information_schema` |
| **INSERT** | `bookings`, `booking_status_history`, `booking_reminder_logs`, `booking_deadline_alert_logs`, `invoices`, `payments` (pending invoice payment) |
| **UPDATE** | `bookings` (fields + payment rollup), sometimes via `recalculatePaymentStatus` from payments module |

---

## 8. Important validations and conditions

**HTTP / Zod**

- UUIDs for ids; array max lengths (hotels/flights/services).
- Travel end ≥ start; cost ≤ total (create + service update).
- Transition to **CANCELLED** requires **cancellationReason**.

**Service errors (examples)**

| Code / situation | Meaning |
|------------------|---------|
| `BOOKING_NOT_FOUND` | Missing or soft-deleted |
| `BOOKING_QUOTATION_NOT_FOUND` | Bad quotation |
| `BOOKING_QUOTATION_NOT_APPROVED` | Quotation not `APPROVED` |
| `BOOKING_ALREADY_EXISTS_FOR_QUOTATION` | Duplicate booking |
| `BOOKING_NUMBER_EXISTS` | Duplicate booking number |
| `BOOKING_ADVANCE_POLICY_VIOLATION` | Advance too low |
| `BOOKING_EXCHANGE_RATE_REQUIRED` | Different currencies, no rate |
| `BOOKING_EXCHANGE_LOCKED` | Rate change blocked |
| `BOOKING_STATUS_LOCKED` | Cannot reopen cancelled |
| `BOOKING_ALREADY_APPROVED` | Approve twice |
| `BOOKING_INVOICE_NUMBER_EXISTS` | Could not allocate invoice number |

Confirmation uses **`getPaymentPolicySnapshot`**: needs **`meetsAdvance`** and **`hasProof`**.

---

## 9. Side effects

| Kind | What happens |
|------|----------------|
| **Logs** | `logger.debug` / `info` / `warn` on operations and reminder failures |
| **Event bus** | `bookings.*` events for integrations |
| **No direct email** | Not in this module; consumers handle notifications |
| **Config** | `config.whatsapp.preTravelDays` / `postTravelDays`; `config.automation.deadlineLookaheadHours` |

---

## 10. Example API request/response

**Create** — `POST /api/bookings`  
Headers: `Authorization: Bearer <token>`

```json
{
  "quotationId": "550e8400-e29b-41d4-a716-446655440000",
  "travelStartDate": "2026-06-01",
  "travelEndDate": "2026-06-10",
  "totalAmount": 100000,
  "costAmount": 85000,
  "clientCurrency": "INR",
  "supplierCurrency": "INR",
  "hotelSegments": [
    {
      "hotelName": "Grand Hotel",
      "checkIn": "2026-06-01",
      "checkOut": "2026-06-05"
    }
  ]
}
```

```json
{
  "data": {
    "id": "...",
    "quotationId": "...",
    "bookingNumber": "BK-...",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "totalAmount": 100000,
    "advanceRequired": 50000,
    "supplierPaymentDeadlineAt": null,
    "deadlineRiskLevel": "SAFE",
    "...": "..."
  }
}
```

**Transition** — `POST /api/bookings/:id/status`

```json
{
  "status": "CONFIRMED"
}
```

**Cancel** — same endpoint

```json
{
  "status": "CANCELLED",
  "cancellationReason": "Customer requested cancellation"
}
```

**List** — `GET /api/bookings?status=PENDING&page=1&limit=20`

**Stats** — `GET /api/bookings/stats`

---

## 11. Notes for developers

- **WhatsApp module** receives `bookingsService` — reminders/alerts are designed to pair with outbound messaging elsewhere.
- **Soft delete:** List hides `isDeleted`; `getById` returns **404** if deleted.
- **Repository** tolerates missing optional tables/columns via introspection — safer rolling deploys.
- **Stats** includes `COMPLETED` status in aggregates — ensure DB/workflows set it if used.
- Subscribe to **`bookings.deadline_alert`** and **`bookings.pre_travel_reminder`** for automation; idempotency uses **reminder** and **deadline alert log** tables.
- Call **`recalculatePaymentStatus(bookingId)`** from payments/refunds flows after money changes.
