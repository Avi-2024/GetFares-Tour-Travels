# Bookings module

## 1. Module overview

The **bookings** module manages travel bookings created from **approved quotations**: amounts, payment status, hotel/flight segments (stored as JSON), supplier/DMC details, deadline fields, status workflow, invoices, reminder logs, and deadline alert logs. It lives under `backend/crm/modules/bookings` and is mounted at **`/api/bookings`**. Access is protected by JWT and RBAC (`bookings:read`, `bookings:create`, `bookings:update`). Data is stored in **MySQL** via `mysql2` and the shared `db` adapter.

## 2. Flow (route → controller → service → repository)

```
bookings.routes.js
  → bookings.controller.js
  → bookings.service.js
  → bookings.repository.js  (SQL / db.insert / db.findMany / raw db.query where needed)
```

Validation uses Zod (`bookings.validation.js`). Events (`bookings.events.js`) emit on create/update/status/invoice/reminders.

## 3. Step-by-step execution (typical request)

1. **`requireAuth`** attaches the user from JWT.
2. **`authorize("bookings:…")`** checks permission.
3. **`validateRequest`** validates query/body/params.
4. **Controller** calls the matching **service** method with `id`, body, and context.
5. **Service** enforces rules (quotation approved, one booking per quotation, advance policy, status transitions, deadlines).
6. **Repository** reads/writes `bookings` and related tables, maps rows to camelCase domain objects, and loads creator user + lead id via quotation when listing.

## 4. Function explanations (repository focus)

| Function / area | Role |
|-----------------|------|
| `toBooking`, `toInvoice`, `toPayment`, `toStatusHistory` | Map DB rows to API-facing objects; parse JSON columns from strings/objects. |
| `hasTable` / `hasColumn` / `getTableColumns` / `sanitizeForTable` | Optional schema introspection (`information_schema`) so code works if some tables/columns are missing. |
| `findAll`, `findById`, `findByQuotationId`, `findByBookingNumber` | List and lookups; list filters soft-deleted rows unless `includeDeleted`. |
| `create` / `update` | Serialize JSON fields (`supplier_details`, `hotel_segments`, etc.) then `db.insert` / `db.update`. |
| `getStats` | Aggregates counts/revenue/pending payments via raw SQL on MySQL or in-memory fallback. |
| `findTravelReminderCandidates` | Finds CONFIRMED bookings for pre/post travel reminders with optional anti-join on reminder logs. |
| `findDeadlineCandidates` | Bookings with supplier/cancellation deadlines for batch processing. |
| `getPaymentPolicySnapshot`, `getVerifiedPaidAmount`, `getProcessedRefundAmount` | Verified payments and refunds for policy and recalculation. |

(Service and controller details: see `bookings-module.md`.)

## 5. Request / response examples

**List** — `GET /api/bookings?status=PENDING&page=1&limit=20`  
Header: `Authorization: Bearer <token>`

**Create** — `POST /api/bookings`

```json
{
  "quotationId": "550e8400-e29b-41d4-a716-446655440000",
  "travelStartDate": "2026-06-01",
  "travelEndDate": "2026-06-10",
  "totalAmount": 100000,
  "costAmount": 85000,
  "clientCurrency": "INR",
  "supplierCurrency": "INR"
}
```

**Response** (shape): `{ "data": { …booking fields… } }` with `bookingNumber`, `status`, `paymentStatus`, deadline fields, etc.

**Stats** — `GET /api/bookings/stats` → `{ "data": { totalBookings, activeBookings, … } }`

## 6. Database tables used

| Table | Typical use |
|-------|-------------|
| `bookings` | Main record; JSON columns for segments and supplier/DMC blobs. |
| `quotations` | Resolve `lead_id`, quotation status when creating. |
| `users` | Creator name/email on list/detail. |
| `payments` | Verified amounts, proof references, pending invoice payment rows. |
| `refunds` | Processed refund totals. |
| `invoices` | Generated invoices. |
| `booking_status_history` | Status change audit. |
| `booking_reminder_logs` | Idempotent travel reminders. |
| `booking_deadline_alert_logs` | Idempotent deadline alerts (`metadata` JSON). |

## 7. Important business rules

- Booking only from **APPROVED** quotation; **one** booking per quotation (enforced in service).
- **Advance** policy and **payment proof** required to reach **CONFIRMED** (service + `getPaymentPolicySnapshot`).
- **Soft delete:** `is_deleted` / `isDeleted` hides rows from normal reads.
- **Exchange rate** rules when client/supplier currencies differ (service).
- **Deadlines** and **risk level** are computed in the service; repository stores raw deadline timestamps.

## 8. Notes for developers

- Set **`MYSQL_*`** env vars so `db.adapter === "mysql"` and **raw stats/payment queries** run (otherwise slower in-memory fallbacks where implemented).
- **JSON:** `BOOKING_JSON_COLUMNS` and deadline log `metadata` are stringified for MySQL JSON columns; reading back uses `JSON.parse` in mappers.
- **Risky areas:** large `getStats` aggregate query; raw `SELECT` on `payments`/`refunds`; **bulk** reminder/deadline batches; optional `gateway_payment_id` in payment snapshot SQL if your schema omits it (may need a migration).
- **Transactions:** this repository does not open multi-statement transactions; payment/booking consistency relies on service calls and single-row updates.
- Full HTTP map and error codes: **`docs/modules/bookings-module.md`**.
