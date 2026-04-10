# Payments module — developer guide

**Location:** `backend/crm/modules/payments`  
**Base URL:** `/api/payments`

Records **payments** against **bookings** (amount, mode, gateway fields, proof/invoice URLs, verification). After each **create**, **update**, or **verify**, it **recomputes** the parent booking’s **`advance_received`** and **`payment_status`** from **verified** payments minus **processed refunds**.  
Supports **multipart uploads** to **S3** for proof/invoice files. Exposes **aggregate stats** (collected, outstanding, overdue, refunds).  
**RBAC:** `payments:read`, `payments:create`, `payments:update`.

**Tables:** `payments`, `bookings` (updates), `refunds` (read for totals) (`payments.schema.js`).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | `requireAuth`, `authorize`, Zod, **multer** (`proofFile`, `file`, `invoiceFile`) on write routes. |
| **Controller** | Uploads buffers to **S3** (`dependencies.storage.s3`), merges URLs into body, **`downloadAttachment`** proxies file from URL. |
| **Service** | Booking guards, **mode/currency** normalization, **syncBookingPaymentSummary**, events. |
| **Repository** | Payment CRUD, booking read/update, **verified paid sum**, **refund sum**, **getStats** (Postgres SQL + fallbacks), optional **`invoice_url`** column probe. |

---

## Step-by-step flow

### Create / update / verify (with files)

1. **Multer** parses multipart → **`req.files`**.  
2. **Controller** uploads each file via **`s3.uploadBuffer`** → sets **`proofUrl`** / **`invoiceUrl`** on payload (**500** if S3 missing when file present).  
3. **validateRequest`** runs on body (URLs can also be sent as JSON without files).  
4. **Service** validates **booking** exists, not deleted, not **CANCELLED** → writes payment → **`syncBookingPaymentSummary`**.  
5. **Events:** **`payments.created`** / **`payments.updated`** / **`payments.verified`** as applicable.

### List / get / stats

**Controller** → **service** → **repository** → JSON **`{ data: ... }`**.

### Download attachment

**Service** resolves **proof** vs **invoice** URL → **controller** **`fetch`**es URL → streams bytes to client (**502** if fetch fails).

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `payments:read` |
| GET | `/stats` | `payments:read` |
| GET | `/:id` | `payments:read` |
| GET | `/:id/attachments/:attachmentType` | `payments:read` |
| POST | `/` | `payments:create` |
| PATCH | `/:id` | `payments:update` |
| POST | `/:id/verify` | `payments:update` |

**`attachmentType`:** `invoice` \| `proof` (Zod).

Static paths (`/stats`) are registered before `/:id` so they are not captured as ids.

---

## Function-wise explanation

### `payments.controller.js`

| Handler | Purpose |
|---------|---------|
| `list` | `service.list(query, context)` |
| `stats` | `service.stats(context)` |
| `getById` | `service.getById(id, context)` |
| `create` | Upload files → **`service.create`** → **201** |
| `update` | Upload files → **`service.update`** |
| `verify` | Upload files → **`service.verify`** |
| `downloadAttachment` | **`service.getAttachmentDownload`** → proxy download |

### `payments.service.js`

| Name | Purpose |
|------|---------|
| `normalizePaymentMode` | Maps UPI/CARD/BANK/GATEWAY → internal modes; invalid → **400** `PAYMENT_INVALID_MODE`. |
| `getBookingById` | **404** `PAYMENT_BOOKING_NOT_FOUND`; **409** `PAYMENT_BOOKING_CANCELLED` if booking cancelled. |
| `syncBookingPaymentSummary` | Sum **verified** non-refunded payments − **processed** refunds → **`advance_received`** + **`payment_status`** (PENDING / PARTIAL / FULL / REFUNDED) on **booking**. |
| `buildCreateRecord` | Maps API → DB; if **`isVerified`** true, sets **`verified_by`**, **`verified_at`**, **`paid_at`**. |
| `list` | `repository.findAll` (mapped filters). |
| `stats` | `repository.getStats()`. |
| `create` | **emitCreated** includes **`bookingPaymentStatus`**. Response includes **`bookingPaymentStatus`**, **`bookingAdvanceReceived`**. |
| `update` | Partial patch; **emitUpdated**; sync booking. |
| `verify` | Forces **`is_verified`**, sets **`paid_at`**, default status **FULL** if was **PENDING**; **emitVerified** + **emitUpdated**; sync booking. |
| `getAttachmentDownload` | Returns `{ url, type, fileName }` for controller stream. |

### `payments.repository.js`

| Function | Purpose |
|----------|---------|
| `toPayment` / `toBooking` | Row → domain. |
| `findAll` | `findMany` + sort by **createdAt** desc. |
| `create` / `update` | Strips **`invoice_url`** if column missing (migration-safe). |
| `findBookingById` / `updateBooking` | Booking sync. |
| `getVerifiedPaidAmount` | SQL or in-memory sum. |
| `getProcessedRefundAmount` | From **`refunds`** where status **PROCESSED**. |
| `getStats` | Aggregates: collected from **payments**; outstanding/overdue from **bookings** (travel before today = overdue balance); refunds from **`refunds`**. Handles missing **`is_deleted`** / **`travel_start_date`** columns. |

### `payments.validation.js`

- **Status:** PENDING, PARTIAL, FULL, REFUNDED.  
- **Modes:** CASH, BANK_TRANSFER, PAYMENT_GATEWAY, UPI, CARD, BANK, GATEWAY.  
- **Create:** required **bookingId**, **amount**, **paymentMode**; optional gateway fields, URLs, **paidAt**, **isVerified**.  
- **Update:** ≥1 field.  
- **Verify:** optional body fields + param **id**.

### `payments.events.js`

- **`payments.created`**, **`payments.updated`**, **`payments.verified`** + **`logger.info`**.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Filters: bookingId, status, mode, isVerified, page, limit | `findAll` | Sorted payment array |
| **Stats** | — | SQL aggregates | Totals object |
| **Get** | UUID | `findById` | Payment or **404** |
| **Create** | JSON + optional files | S3 URLs, insert, sync booking | **201** payment + booking rollup fields |
| **Patch** | Partial + optional files | Update, sync booking | Payment + rollup |
| **Verify** | Optional proof/invoice + metadata | Mark verified, sync booking | Payment + rollup |
| **Download** | id + attachmentType | Resolve URL, stream | File bytes |

---

## Business logic (simple terms)

- Payments belong to a **booking**; **cancelled** bookings cannot receive new payment operations.  
- **Verified** money counts toward the booking balance; **refunds** reduce the net. Booking **payment status** mirrors net vs **total** selling price.  
- **Modes** like **UPI** map to **gateway-style** storage internally.  
- **Verify** endpoint is the main “accounts approved this” path; it also bumps status toward **FULL** when appropriate.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `payments`, `bookings`, `refunds` (stats / sums) |
| **INSERT** | `payments` |
| **UPDATE** | `payments`, `bookings` (rollup fields) |

---

## Validations and conditions

- Zod on params/body.  
- **404** missing payment or booking.  
- **409** booking cancelled.  
- **400** invalid payment mode (service).  
- **500** `S3_NOT_CONFIGURED` if file uploaded but **S3** missing.  
- **404** `PAYMENT_ATTACHMENT_NOT_FOUND` if download requested but URL missing.  
- **502** if storage URL not fetchable on download.

---

## Side effects

| Kind | Details |
|------|---------|
| **S3** | File storage for proofs/invoices (controller). |
| **Event bus** | `payments.created`, `payments.updated`, `payments.verified` — feeds **notifications** subscribers elsewhere. |
| **Email / SMS** | **None** in this module. |
| **Automation** | **Booking** financial fields stay in sync after each payment change; no cron here. |

---

## Example API request/response

**Create** — `POST /api/payments`  
`multipart/form-data`: fields from `createPayload` + optional **`proofFile`**, **`invoiceFile`** (or legacy **`file`** for proof).

```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 25000,
  "currency": "INR",
  "paymentMode": "BANK_TRANSFER",
  "paymentReference": "UTR123456"
}
```

**Response** — `201`: payment object plus **`bookingPaymentStatus`**, **`bookingAdvanceReceived`** when sync succeeds.

**Verify** — `POST /api/payments/:id/verify` (optional body + files).

**Stats** — `GET /api/payments/stats` → collected/outstanding/overdue/refund aggregates.

**Download** — `GET /api/payments/:id/attachments/proof` (or `invoice`).

---

## Notes for developers

- **`syncBookingPaymentSummary`** is shared conceptually with **bookings** module (`recalculatePaymentStatus`); both keep **`bookings.advance_received`** / **`payment_status`** aligned.  
- **`invoice_url`** is stripped on insert/update when the column is absent—run migrations before relying on invoice uploads.  
- **List** filtering uses **`db.findMany`**; confirm whether **`page`/`limit`** are applied by your DB adapter (service does not slice).  
- **Download** uses **`fetch`** server-side; private buckets must expose **HTTPS URLs** readable by the API (or replace with signed-URL flow later).
