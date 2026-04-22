# Customers module

## 1. Module overview

The **customers** module provides CRUD for **customer** records (contact, segment, lifetime value, PAN, address, currency). List and get responses can include **booking stats**: total bookings, last booking date, and last booking number, computed via **leads → quotations → bookings**. Delete is a **soft delete** (`is_deleted`). Routes live under **`/api/customers`**. RBAC: `customers:read`, `customers:create`, `customers:update`. Data is stored in **MySQL** via the shared `db` adapter.

## 2. Flow (route → controller → service → repository)

```
customers.routes.js
  → customers.controller.js
  → customers.service.js (mapping, events, booking summary merge)
  → customers.repository.js (CRUD + optional raw SQL aggregation)
```

## 3. Step-by-step execution

1. **`requireAuth`** and **`authorize`** run for each route.
2. **`validateRequest`** fills **`req.validated`** from Zod schemas.
3. **Controller** calls **service** with query/body and context.
4. **Service** maps camelCase ↔ snake_case, loads customers, calls **`findBookingSummaryByCustomerIds`** for list/get, maps to API shape, emits **`customers.created`** / **`customers.updated`**.
5. **Repository** uses **`db.findMany` / `findById` / `insert` / `update`**, optionally filters fields using **`information_schema`** column lists.

## 4. Function explanations (repository focus)

| Function | Role |
|----------|------|
| `getTableColumns` / `sanitizeForTable` | Reads **`information_schema.COLUMNS`** so inserts/updates ignore columns missing in DB (migration-safe). |
| `findAll` | **`db.findMany`** with sanitized filters. |
| `findById` / `create` / `update` | Standard CRUD on **`customers`** table after sanitize. |
| `findBookingSummaryByCustomerIds` | When **`db.query`** + MySQL: one aggregated query with joins and a correlated subquery for “latest” booking number; respects optional **`is_deleted`** on leads/quotations/bookings. Otherwise builds summaries in JavaScript from full table scans. |

(Service details: **`customers-module.md`**.)

## 5. Request / response examples

**Create** — `POST /api/customers`  
Header: `Authorization: Bearer <token>`

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+919876543210",
  "segment": "GOLD",
  "clientCurrency": "INR"
}
```

**Response (shape):** `{ "data": { "id": "...", "fullName": "...", "totalBookings": 0, "lastBookingDate": null, "lastBookingNumber": null, ... } }`

**List** — `GET /api/customers?segment=GOLD&limit=50`

## 6. Database tables used

| Table | Role |
|-------|------|
| `customers` | Primary CRUD; soft delete via `is_deleted`. |
| `leads` | Links `customer_id` to leads (when column exists). |
| `quotations` | Connects leads to bookings. |
| `bookings` | Count and “last booking” stats. |

## 7. Business rules

- List hides soft-deleted customers (service layer).
- Booking stats require **`leads.customer_id`**; if missing, summaries return empty maps for that path.
- Soft-delete columns on joined tables are honored when present (`COALESCE(is_deleted, 0) = 0`).
- Segment and financial fields follow validation rules in **`customers.validation.js`**.

## 8. Developer notes

- **Env:** set **`MYSQL_*`** so `db.adapter === "mysql"` and raw aggregation runs; without it, in-memory DB uses JS fallback only.
- **Risky areas:** **`findBookingSummaryByCustomerIds`** — correlated subquery + **`GROUP BY`**; must match MySQL **`sql_mode`** (e.g. `ONLY_FULL_GROUP_BY`); large datasets may need indexes on `customer_id`, `lead_id`, `quotation_id`.
- **Transactions:** repository does not wrap multi-table reads in a transaction.
- **JSON:** not central to customers table in this module.
- Full HTTP map and service behaviour: **`docs/modules/customers-module.md`**.
