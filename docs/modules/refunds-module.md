# Refunds module — developer guide

**Location:** `backend/crm/modules/refunds`  
**Base URL:** `/api/refunds`

Manages **refund requests** tied to **bookings** (and optionally **payments**). Tracks a simple **status workflow**: **INITIATED** → **APPROVED** / **REJECTED** → **PROCESSED** (for approved). Enforces **refundable balance** from **verified payments** minus **already processed** refunds. **No** direct email or SMS in this module; **event bus** emits lifecycle events for subscribers.

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | CRUD + **approve** / **reject** / **process**. Auth + **`authorize`** per action. |
| **Controller** | Passes validated query/body/params and **`req.context`** to **service**. |
| **Service** | Business rules: booking/payment checks, balance math, manager threshold on **approve**, payment/booking updates on **process**. |
| **Repository** | **`refunds`** CRUD; reads **`bookings`** / **`payments`**; aggregates for **paid** and **refunded** totals. |
| **Events** | **`refunds.created`**, **`updated`**, **`approved`**, **`rejected`**, **`processed`**. |

**Tables (`refunds.schema.js`):** primary **`refunds`**; also **`bookings`**, **`payments`** (read/update).

**Permissions:** **`refunds:read`** (list, get), **`refunds:create`** (create), **`refunds:update`** (update, approve, reject, process).

---

## Step-by-step flow

1. **`requireAuth`** → user on **`req.context`**.  
2. **`authorize(...)`** — RBAC permission string.  
3. **`validateRequest`** (Zod).  
4. **Controller** → **service** → **repository** / **`db`**.  
5. **Service** may **emit** events after mutations.

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `refunds:read` |
| GET | `/:id` | `refunds:read` |
| POST | `/` | `refunds:create` |
| PATCH | `/:id` | `refunds:update` |
| POST | `/:id/approve` | `refunds:update` |
| POST | `/:id/reject` | `refunds:update` |
| POST | `/:id/process` | `refunds:update` |

---

## Function-wise explanation

### Controller (`refunds.controller.js`)

| Handler | Service call | Status |
|---------|----------------|--------|
| `list` | `list(query, context)` | 200 |
| `getById` | `getById(id, context)` | 200 |
| `create` | `create(body, context)` | 201 |
| `update` | `update(id, body, context)` | 200 |
| `approve` | `approve(id, body \|\| {}, context)` | 200 |
| `reject` | `reject(id, body \|\| {}, context)` | 200 |
| `process` | `process(id, body \|\| {}, context)` | 200 |

### Service (`refunds.service.js`)

| Function | Purpose |
|----------|---------|
| **`getById`** | Load refund; **404** if missing. |
| **`getBookingById`** | Load booking; **404** if missing or **soft-deleted** (`isDeleted`). |
| **`getPaymentById`** | Load payment; must match **bookingId** or **409**. |
| **`getRefundableBalance`** | **`paidAmount`** (verified, non-REFUNDED payments) minus **sum of PROCESSED** refund amounts on booking → **`refundableBalance`**. |
| **`syncBookingPaymentSummary`** | Recomputes **`advance_received`** as **net received** (paid − processed refunds) and **`payment_status`** on booking: **PENDING** / **PARTIAL** / **FULL** / **REFUNDED**. |
| **`buildCreateRecord`** (internal) | Maps payload to DB row; status **INITIATED**. |
| **`list`** | Delegates **`repository.findAll`** (filters, sorted by **createdAt** desc). |
| **`create`** | Validates booking (+ optional payment); ensures **`refundAmount` ≤ refundable balance**; **INSERT**; **`emitCreated`**. |
| **`update`** | Only if status **INITIATED**; patches amounts/gateway id; rechecks balance (**adds back** current refund amount to the cap so edits stay fair); **`emitUpdated`**. |
| **`approve`** | Only **INITIATED**; if **`refundAmount` > 10 000** (constant **`POLICY.managerApprovalThreshold`**), user **`role`** must be **admin**, **super_admin**, **manager**, or **sales_manager**; sets **APPROVED** + **`approved_by`**; **`emitApproved`** + **`emitUpdated`**. |
| **`reject`** | Cannot reject if **PROCESSED**; idempotent if already **REJECTED**; else **REJECTED**; **`emitRejected`** + **`emitUpdated`**. |
| **`process`** | Only **APPROVED** → **PROCESSED**, sets **`processed_at`**, optional **`gateway_refund_id`**; optionally marks linked **payment** **REFUNDED** if refund amount **≥** payment amount; **`syncBookingPaymentSummary`**; **`emitProcessed`** + **`emitUpdated`**. |

Exported **`REFUND_STATUS`**, **`syncBookingPaymentSummary`** (for other modules or jobs).

### Repository (`refunds.repository.js`)

| Method | DB |
|--------|-----|
| `findAll` | **`findMany`** on **`refunds`** with mapped filters; maps rows; sort newest first. |
| `findById` / `create` / `update` | **`refunds`** via generic **`db`**. |
| `findBookingById` / `updateBooking` | **`bookings`**. |
| `findPaymentById` / `updatePayment` | **`payments`**. |
| `getVerifiedPaidAmount` | **SUM(amount)** where **verified**, status **≠ REFUNDED** (raw SQL if **`db.query`** available, else filter in memory). |
| `getProcessedRefundAmount` | **SUM(refund_amount)** where status **PROCESSED** for booking. |

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **Create** | `bookingId`, `refundAmount`, optional `paymentId`, penalties, gateway id | Validate booking/payment; cap by balance | Refund row **INITIATED** |
| **Update** | Partial amounts / gateway id | Only **INITIATED**; re-validate cap | Updated refund |
| **Approve** | Optional `note` (and validated `approvedAt` — **not** persisted in service) | Role check for high amount; **APPROVED** | Updated refund |
| **Reject** | Optional `reason` | Status **REJECTED** | Updated refund |
| **Process** | Optional `gatewayRefundId`, `processedAt`, `markPaymentRefunded` | **PROCESSED**; maybe mark payment; sync booking | Refund + **`bookingPaymentStatus`**, **`bookingAdvanceReceived`** |

---

## Business logic (simple terms)

- Refunds belong to a **booking**; optional **payment** link must match that booking.  
- **Money available to refund** = money **verified** as received on the booking, minus refunds already **processed** (completed). **Initiated** / **approved** rows do **not** reduce “processed” totals until **process** runs.  
- **Updates** only while **INITIATED**; balance check **releases** the current row’s amount when recalculating the max.  
- **Large refunds** (above **10 000** in service currency units) need a **manager/admin-class** role to **approve** (string match on `context.user.role`).  
- **Process** finalizes: records gateway/time, may mark the **payment** line as **REFUNDED**, and **rebuilds** booking **advance received** and **payment status**.

---

## Database operations

| Operation | Where |
|-----------|--------|
| **SELECT** | `refunds` (list/get), `bookings`, `payments`, aggregates on `payments` / `refunds` |
| **INSERT** | `refunds` (create) |
| **UPDATE** | `refunds` (patch, approve, reject, process); `payments` (optional on process); `bookings` (sync after process) |

---

## Validations and conditions (Zod + service)

- **Create:** `bookingId` UUID; **`refundAmount` positive**; optional UUID **`paymentId`**; non-negative **supplierPenalty** / **serviceCharge**; optional **gatewayRefundId** length.  
- **Update:** at least one field; positive **refundAmount** if present.  
- **List query:** optional **pagination**, **bookingId**, **paymentId**, **status**, **approvedBy**.  
- **Approve/reject/process:** **`id`** UUID; optional note/reason/gateway/processedAt; **`markPaymentRefunded`** boolean on process.  
- **Service:** **409** when over balance, wrong status, payment/booking mismatch; **403** high-refund approval; **404** missing entities.

**Note:** **`approvedAt`** / **`rejectedAt`** appear in validation but are **not** written to the DB in **`approve`** / **`reject`** — only **`emit*`** payloads may carry **`note`** / **`reason`**.

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | **`refunds.*`** events — use for notifications/analytics elsewhere. |
| **Booking/payment rows** | Updated on **process** (and booking summary sync). |
| **Email/SMS** | **None** in this module. |

---

## Example API request/response

**Create** — `POST /api/refunds`

```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "paymentId": "660e8400-e29b-41d4-a716-446655440001",
  "refundAmount": 5000,
  "supplierPenalty": 0,
  "serviceCharge": 0
}
```

**Process** — `POST /api/refunds/:id/process`

```json
{
  "gatewayRefundId": "gw_rfnd_abc123",
  "processedAt": "2026-04-11T10:00:00.000Z",
  "markPaymentRefunded": true
}
```

**Response (process)** includes extra fields such as **`bookingPaymentStatus`** and **`bookingAdvanceReceived`** when sync runs.

---

## Notes for developers

- **Threshold** **`managerApprovalThreshold`** is **hardcoded** (`10000`) in **`refunds.service.js`** — change policy in one place if product rules shift.  
- **Role names** for high approval are **lowercased** string checks — must match **`context.user.role`** from auth.  
- **List** filtering depends on **`db.findMany`** supporting passed keys (`booking_id`, etc.) — confirm adapter behavior.  
- **`syncBookingPaymentSummary`** is exported — safe to call from jobs after external refund reconciliation if needed.  
- Subscribers to **`refunds.processed`** should not assume emails were sent; trigger finance comms in listener if required.
