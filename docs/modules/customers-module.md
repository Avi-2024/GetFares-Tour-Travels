# Customers module — developer guide

**Location:** `backend/crm/modules/customers`  
**Base URL:** `/api/customers`

CRUD for **customer** records (contact, segment, lifetime value, PAN, address, currency). **List** and **get** enrich each customer with **booking stats** derived from **leads → quotations → bookings** (total count, last booking date/number). **Delete** is **soft** (`is_deleted`).  
**RBAC:** `customers:read`, `customers:create`, `customers:update`.  
**Events:** `customers.created`, `customers.updated` (+ `logger.info`). **No** email, SMS, or scheduled jobs inside this module; other modules can **automate** off the event bus (e.g. notifications).

**Tables:** `customers` (primary); read-only joins on **`leads`**, **`quotations`**, **`bookings`** for summaries (`customers.schema.js`).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | JWT, `authorize`, Zod `validateRequest`, controller. |
| **Controller** | Passes `req.validated` + `req.context` to service. |
| **Service** | Maps camelCase ↔ snake_case; **404** on missing get/update/remove; **list** hides deleted; attaches **booking summary**; fires **events** (payload = raw DB row from create/update). |
| **Repository** | `findMany` / `findById` / `insert` / `update`; **column introspection** to drop unknown fields; **booking aggregation** (Postgres SQL or in-memory fallback). |

---

## Step-by-step flow

1. **`requireAuth`** → **`authorize(...)`**  
2. **`validateRequest`** → **`req.validated`**  
3. **Controller** → **service**  
4. **Service** → **repository**  
5. **Response** `{ data: ... }` with **200** / **201**

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `customers:read` |
| GET | `/:id` | `customers:read` |
| POST | `/` | `customers:create` |
| PATCH | `/:id` | `customers:update` |
| DELETE | `/:id` | `customers:update` |

---

## Function-wise explanation

### `customers.controller.js`

| Function | Service call | Status |
|----------|----------------|--------|
| `list` | `list(query, context)` | 200 |
| `getById` | `getById(id, context)` | 200 |
| `create` | `create(body, context)` | 201 |
| `update` | `update(id, body, context)` | 200 |
| `remove` | `remove(id, context)` | 200 |

### `customers.service.js`

| Name | Purpose |
|------|---------|
| `mapListFilters` | Query → DB keys (`client_currency`, etc.). |
| `mapCreatePayload` / `mapUpdatePayload` | Body → snake_case for repository. |
| `toCustomer` | Row → API + optional **`totalBookings`**, **`lastBookingDate`**, **`lastBookingNumber`**. |
| `list` | `findAll` → filter out **`is_deleted`** → **`findBookingSummaryByCustomerIds`** → map. |
| `getById` | `findById`; **404** `CUSTOMERS_NOT_FOUND` if missing; booking summary for one id. **Does not** reject deleted rows—see notes. |
| `create` | `insert` → **`emitCreated`** (raw row) → `toCustomer`. |
| `update` | **`getById`** first → `update` → **`emitUpdated`** → `toCustomer`. |
| `remove` | **`getById`** → `update` **`is_deleted: true`** → **`emitUpdated`**. |

### `customers.repository.js`

| Function | Purpose |
|----------|---------|
| `getTableColumns` / `sanitizeForTable` | Filter payload keys to real columns (migrations-safe). |
| `findAll` | Passes filters through to **`db.findMany`**. |
| `findById` / `create` / `update` | Standard CRUD on **`customers`**. |
| `findBookingSummaryByCustomerIds` | **Postgres:** `JOIN` leads → quotations → bookings, `COUNT`, `MAX`, latest booking number; respects soft-delete columns if present. **Fallback:** load all three tables and compute in JS. |

### `customers.validation.js`

- **Segment:** `PLATINUM` \| `GOLD` \| `SILVER` \| `NEW`.  
- **Create:** required **fullName**; optional contact/financial fields.  
- **Update:** ≥1 field.  
- **List:** optional `page`, `limit`, `segment`, `email`, `phone`, `clientCurrency`.

### `customers.events.js`

- **`customers.created`** / **`customers.updated`** — `logger.info` + `eventBus.emit`.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Query filters | Load customers + booking summaries | Array of customers + stats |
| **Get** | UUID | Load one + summary | One customer |
| **Create** | Body | Insert | **201** |
| **Patch** | ≥1 field | Update | **200** |
| **Delete** | UUID | Soft-delete | **200** (customer object reflecting update) |

---

## Business logic (simple terms)

- A **customer** is a master record for people you sell to; **leads** link to **`customer_id`** elsewhere in the app.  
- **Booking stats** are **not** stored on the customer row—they are **computed** by walking **lead → quotation → booking** for that `customer_id`.  
- **Soft delete** keeps the row but **list** excludes deleted; **get by id** still returns the row if you know the UUID (including deleted)—callers/UI should handle that if needed.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `customers`; aggregation reads **`leads`**, **`quotations`**, **`bookings`** |
| **INSERT** | `customers` |
| **UPDATE** | `customers` (including **`is_deleted`**) |

---

## Validations and conditions

- Zod on HTTP; **404** if id missing for get/update/delete.  
- Repository drops keys for columns that do not exist yet (**information_schema**).

---

## Side effects (emails, notifications, automation)

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.debug` on list/get; repository debug on write |
| **Event bus** | `customers.created`, `customers.updated` — e.g. **notifications** module can subscribe and create in-app alerts (**not** implemented here) |
| **Email / SMS** | **None** in this module |
| **Cron / automation** | **None** here; use **`events`** or call **service** from jobs if needed |

---

## Example API request/response

**Create** — `POST /api/customers`

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+919876543210",
  "segment": "GOLD",
  "clientCurrency": "INR"
}
```

**Response** — `201`

```json
{
  "data": {
    "id": "...",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+919876543210",
    "segment": "GOLD",
    "lifetimeValue": 0,
    "clientCurrency": "INR",
    "totalBookings": 0,
    "lastBookingDate": null,
    "lastBookingNumber": null,
    "createdAt": "..."
  }
}
```

**List** — `GET /api/customers?segment=GOLD&limit=50`

**Soft delete** — `DELETE /api/customers/:id` → customer marked deleted; still **emits** `customers.updated`.

---

## Notes for developers

- **`create`** does not pass **`context`** into **`emitCreated`** payload shape—events receive **repository row** (often **snake_case**); normalize in subscribers if needed.  
- **`page` / `limit`** are validated but **service `list`** does not slice pages—behavior depends on **`db.findMany`**; verify adapter implements pagination or add it in service/repository.  
- **`customer_leads`** in schema is unused by this repository file—relationships may live in **leads** module.  
- **Booking summary** on **Postgres** is efficient; fallback is **O(n)** table scans—avoid in huge datasets.  
- For **automation**, wire **`customers.created` / `customers.updated`** in **`notifications.subscribers.js`** (already listed in domain events) or custom jobs.
