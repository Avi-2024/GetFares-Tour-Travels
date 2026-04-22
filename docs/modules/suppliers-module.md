# Suppliers module — developer guide

**Location:** `backend/crm/modules/suppliers`  
**Base URL:** `/api/suppliers`

Manages **vendor/supplier master data** (`suppliers` table) and **accounts payable** per booking: **`supplier_payables`** (amount owed / paid / due), **`supplier_payable_settlements`** (partial payments toward a payable), and optional **`supplier_payable_alert_logs`** for **due-date / overdue** reminders. **Bookings** are linked for payables and for a **supplier bookings** report that reads **`bookings.supplier_details`** and quotation **service rows**.

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | CRUD suppliers; payables & settlements; **deadline alert** batch endpoint. Static **`/payables/...`** paths are registered **before** **`/:id`** to avoid clashes. |
| **Controller** | Passes validated **query/body/params** + **`req.context`** to **service**. |
| **Service** | Maps API ↔ DB columns; **payable** amount rules; **settlement** orchestration; **service name** normalization for booking list; **deadline alert** loop with deduplication. |
| **Repository** | Generic **`db`** + **raw SQL** where needed (bookings by supplier, settlement **transaction**, aggregates). **Column whitelist** via **`information_schema`** for inserts/updates. |
| **Events** | Supplier and payable lifecycle + **deadline alerts** (see below). |

**Tables (`suppliers.schema.js`):** **`suppliers`**, **`supplier_payables`**, **`supplier_payable_settlements`**, **`supplier_payable_alert_logs`**, **`bookings`**, **`users`**. Join SQL also references **`quotations`**, **`leads`**, **`customers`**, **`destinations`** (string fallbacks in repository if not on schema object).

**Permissions:** **`suppliers:read`** (lists/gets), **`suppliers:create`**, **`suppliers:update`** (mutations including payables, settlements, alerts).

---

## Step-by-step flow

1. **`requireAuth`** + **`authorize`**.  
2. **`validateRequest`** (Zod).  
3. **Controller** → **service** → **repository**.  
4. On create/update/settle/alerts: **events** fire; some paths **INSERT** alert logs.

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `suppliers:read` |
| POST | `/` | `suppliers:create` |
| PATCH | `/payables/:payableId` | `suppliers:update` |
| GET | `/payables/:payableId/settlements` | `suppliers:read` |
| POST | `/payables/:payableId/settlements` | `suppliers:update` |
| POST | `/payables/process-deadline-alerts` | `suppliers:update` |
| GET | `/:id` | `suppliers:read` |
| PATCH | `/:id` | `suppliers:update` |
| GET | `/:id/payables` | `suppliers:read` |
| GET | `/:id/settlements` | `suppliers:read` |
| GET | `/:id/bookings` | `suppliers:read` |
| POST | `/:id/payables` | `suppliers:update` |

---

## Function-wise explanation

### Controller

Thin wrappers: each method calls the matching **service** method and returns **`{ data: ... }`** (**201** on supplier/payable create).

### Service — suppliers

| Function | Purpose |
|----------|---------|
| **`list`** | **`repository.findAll`** with mapped filters; drops **`is_deleted`**; maps via **`toSupplier`**. |
| **`getById`** | By id; **404** if missing or **soft-deleted**. |
| **`create`** | **`mapCreatePayload`**; **`is_deleted: false`**; **`emitCreated`**. |
| **`update`** | Ensures supplier exists; **`mapUpdatePayload`** (partial fields); **`emitUpdated`**. |

### Service — payables

| Function | Purpose |
|----------|---------|
| **`listPayables`** | Ensures supplier; lists payables with optional **status** / **bookingId** / pagination. **`toPayable`** adds **`pendingAmount`**, **`dueInDays`**. |
| **`createPayable`** | Ensures supplier + booking exists. Validates **payableAmount > 0**, **paid ≥ 0**, **paid ≤ payable**. **Upsert** by **(supplier, booking)**: if row exists, **update** if something changed; else **insert**. Status via **`derivePayableStatus`** (**PENDING** / **PARTIAL** / **PAID**) unless **`status`** provided. **`last_paid_at`** set when **`paidAmount`** is sent on create/update path. |
| **`updatePayable`** | Loads payable; ensures supplier matches **context** access via **`getById(supplier)`**; same numeric rules; patch. |
| **`settlePayable`** | **Partial settlement**: **`repository.applySettlement`** increases **`paid_amount`**, recalculates status, inserts **settlement** row (if table exists). Returns **`{ payable, settlement }`**. |
| **`listPayableSettlements`** | Validates payable exists + supplier; paginated settlements for that payable. |
| **`listSupplierSettlements`** | Paginated settlements for supplier; optional **booking**, **payable**, **from**/**to** on settlement date. |

### Service — bookings & alerts

| Function | Purpose |
|----------|---------|
| **`listSupplierBookings`** | Bookings where **`supplier_details`** JSON references this supplier; enriches customer, destination, **service name** from quotation **serviceRows** (Postgres) or JSON fallback. |
| **`processPayableDeadlineAlerts`** | Loads candidate payables (**PENDING/PARTIAL**, **due_date** set). For each: if **overdue** or **due within lookaheadDays** (default **2**, max **60**), and no **alert log** for **(payable, alertType, alertDate)**, **INSERT** log + **`emitPayableDeadlineAlert`**. Caps batch **limit** (default **200**, max **1000**). |

### Repository (selected)

| Method | Behavior |
|--------|----------|
| **`findBookingsBySupplierId`** | Complex **SQL** (Postgres): `supplier_details` match + **LATERAL** string_agg of service labels from **`quotations.template_snapshot`** JSON; fallback filter if no raw SQL. |
| **`applySettlement`** | **Postgres + pool:** **`BEGIN`**, **`SELECT ... FOR UPDATE`** payable, validate amount ≤ **pending**, **UPDATE** payable, **INSERT** settlement, **`COMMIT`**. Non-pg: sequential updates + optional insert. |
| **`findPayableDeadlineCandidates`** | Payables with **due_date**, status in **PENDING/PARTIAL**, ordered by **due_date**, **LIMIT**. |
| **`findPayableAlertLog`** / **`createPayableAlertLog`** | Dedup table; no-op if table missing. |

### Events (`suppliers.events.js`)

| Event | When |
|-------|------|
| **`suppliers.created`** / **`suppliers.updated`** | Supplier CRUD |
| **`suppliers.payable_created`** / **`payable_updated`** | Payable create/update/settle (settle also fires **updated**) |
| **`suppliers.payable_settled`** | After successful settlement |
| **`suppliers.payable_deadline_alert`** | After new alert log row ( **`logger.warn`** ) |

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List suppliers** | Query filters | DB find | Supplier rows |
| **Create payable** | **bookingId**, amounts, optional due/status | Upsert by supplier+booking | Payable DTO |
| **Settle** | **amount**, mode, date, reference | Transaction: bump **paid**, insert settlement | **`{ payable, settlement }`** |
| **Deadline alerts** | **lookaheadDays**, **limit**, **referenceDate** | Scan candidates, log + emit | **`{ processed, triggered, skipped, alerts }`** |

---

## Business logic (simple terms)

- A **supplier** is a company you pay for hotels, flights, etc.  
- A **payable** is “how much we owe this supplier for a given **booking**,” with **due date** and **paid** progress.  
- **One payable per (supplier, booking)** — second **POST** updates the same row.  
- **Settlement** is a **payment installment**; it cannot exceed **pending** (payable − already paid).  
- **Status** auto-derives from paid vs payable unless you pass an explicit status where allowed.  
- **Deadline alerts** avoid duplicate fires per **payable + alert type + calendar day** using the log table.  
- **Supplier bookings** list finds bookings whose **supplier_details** JSON points at the supplier; service labels come from quotation builder data when possible.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `suppliers`, `supplier_payables`, `supplier_payable_settlements`, `bookings`, joins to `quotations`/leads/customers/destinations/`users` |
| **INSERT** | `suppliers`, `supplier_payables`, `supplier_payable_settlements`, `supplier_payable_alert_logs` |
| **UPDATE** | `suppliers`, `supplier_payables` (including settlement path) |

**Note:** If **`supplier_payable_settlements`** or **`supplier_payable_alert_logs`** **do not exist**, repository skips inserts / returns empty settlements (checks **`information_schema`**).

---

## Validations and conditions

- **Supplier:** **name** required on create; **email** format; **dates** (**rateValidUntil**, **paymentDeadlineDate**) as **date** strings; **update** requires ≥1 field.  
- **Payable:** **UUID** ids; **payableAmount** positive; **paidAmount** non-negative; status **PENDING|PARTIAL|PAID**.  
- **Settlement:** **amount** positive; **paymentMode** enum; optional **settlementDate**.  
- **Alerts:** **lookaheadDays** 1–60; **limit** 1–1000; optional **referenceDate**.  
- **Service:** numeric checks and **409**-style business errors mapped from repository settlement errors.

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | All **`suppliers.*`** events — wire **notifications** (e.g.in-app) for payables and **deadline alerts**. |
| **Email** | **None** in-module. |
| **Automation** | **`POST /payables/process-deadline-alerts`** intended for **cron** or manual ops. |

---

## Example API request/response

**Create supplier** — `POST /api/suppliers`

```json
{
  "name": "Grand Hotels Ltd",
  "contactPerson": "Ravi Kumar",
  "email": "accounts@grandhotels.example",
  "supplierCurrency": "INR",
  "country": "India"
}
```

**Create or update payable** — `POST /api/suppliers/:id/payables`

```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "payableAmount": 150000,
  "paidAmount": 0,
  "dueDate": "2026-05-01"
}
```

**Settle** — `POST /api/suppliers/payables/:payableId/settlements`

```json
{
  "amount": 50000,
  "paymentMode": "BANK_TRANSFER",
  "reference": "NEFT-123456"
}
```

**Process deadline alerts** — `POST /api/suppliers/payables/process-deadline-alerts`

```json
{
  "lookaheadDays": 3,
  "limit": 100,
  "referenceDate": "2026-04-11T00:00:00.000Z"
}
```

---

## Notes for developers

- **PostgreSQL** recommended for **settlement transactions**, **deadline SQL**, and **booking list** joins.  
- **`mapUpdatePayload`** sends many keys; **undefined** values are stripped in repository — partial PATCH behavior depends on adapter.  
- **Schema** does not list **quotations/leads/customers/destinations** — repository uses **hardcoded** table names in SQL as fallbacks.  
- Register **cron** to call **process-deadline-alerts** daily; tune **lookaheadDays** vs noise.  
- **`supplier_payable_settlements`** missing → settlements list empty; **applySettlement** still updates payable on PG path but may not persist a settlement row — verify migrations in each environment.
