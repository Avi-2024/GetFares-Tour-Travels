# Dashboard module — developer guide

**Location:** `backend/crm/modules/dashboard`  
**Base URL:** `/api/dashboard` (mounted with other feature modules in `backend/crm/modules/index.js`)

Read-only **aggregates** for the CRM UI: **KPI stats** (with period-over-period % change), **revenue series** (current vs previous slot for charts), and **lead source mix** (% by `source`). Uses **PostgreSQL** when `db.query` + `db.pool` exist; otherwise returns **empty/zero defaults**.  
**No** Zod layer, **no** event bus, **no** emails. **`GET /test`** is **public**; other routes require **JWT**.

---

## High-level module overview

| Piece | Role |
|--------|------|
| **Routes** | Registers `/test` (no auth), then `requireAuth` for `/stats`, `/revenue`, `/lead-sources`. |
| **Controller** | Reads `req.query` (`period`, `range`), calls service, returns `{ success, data }` or **500** with message. |
| **Service** | **`getStats`:** prefers **`reportsService.executiveKpis`** when present; else **repository `getStats`**. Normalizes `period` / `range`, computes **% change**. **`getRevenue`** / **`getLeadSources`** delegate to repository. |
| **Repository** | Raw SQL against **`leads`**, **`quotations`**, **`bookings`**; optional column detection (`information_schema`); soft-delete clauses when `is_deleted` exists. |

---

## Step-by-step flow

1. **Request** hits Express router.
2. **`/test`** → inline handler → JSON (no pipeline).
3. **`/stats` | `/revenue` | `/lead-sources`** → **`requireAuth`** (if middleware configured) → **controller** method.
4. **Controller** parses query → **service**.
5. **Service** → **`reportsService.executiveKpis`** (stats only, if available) or **repository** SQL.
6. **Response:** `{ success: true, data: ... }` (or error JSON with **500**).

---

## Function-wise explanation

### `index.js` — `createDashboardModule`

- Builds **repository** from full **`dependencies`** (needs `db`, `logger`).
- **Service** gets **`repository`** + **`dependencies.services?.reports`** (optional **reports** module).
- **Controller** wraps **service**.
- **Router** from **`createDashboardRoutes(dependencies, controller)`**.

### `dashboard.routes.js`

| Route | Auth | Handler |
|-------|------|-----------|
| `GET /test` | None | Fixed “module working” JSON |
| `GET /stats` | `requireAuth` on path | `controller.getStats` |
| `GET /revenue` | `requireAuth` | `controller.getRevenue` |
| `GET /lead-sources` | `requireAuth` | `controller.getLeadSources` |

Query params:

- **Stats:** `period` (default `month`) — see normalization below.
- **Revenue:** `range` (default `week`) — `today` \| `week` \| `month` \| `year`.
- **Lead sources:** `period` (default `month`).

### `dashboard.controller.js`

| Method | Query | Service call |
|--------|-------|----------------|
| `getStats` | `period` (default `'month'`) | `service.getStats(period)` |
| `getRevenue` | `range` (default `'week'`) | `service.getRevenue(range)` |
| `getLeadSources` | `period` (default `'month'`) | `service.getLeadSources(period)` |

Uses **try/catch**, logs errors, **500** on failure. Success shape: **`{ success: true, data }`**.

### `dashboard.service.js`

| Method | Purpose |
|--------|---------|
| `normalizePeriod` | `today`/`day` → `day`; `week`, `year`, else **`month`**. |
| `getWindowRange` | Builds **current** `[start, now]` and **previous** window of **same duration** (used only for **`executiveKpis`** path). |
| `calculateChange` | Percent change vs previous; **0%** if previous is 0. |
| `getStats` | **If `reportsService.executiveKpis`:** two calls (current + previous window), maps to `totalLeads`, `revenue`, `pendingCalls` (= pending + overdue followups from KPIs), `bookings`, each with `*Change`; sets `source: 'executive_kpis_adapter'`. **Else:** `repository.getStats(period)` and maps with `source: 'legacy_dashboard_repository'`. |
| `getRevenue` | `repository.getRevenue(range)` — passthrough. |
| `getLeadSources` | `repository.getLeadSources(period)` — passthrough. |

### `dashboard.repository.js` (legacy SQL path)

| Method | Purpose |
|--------|---------|
| `canUseRawQuery` | True if `db.query` and `db.pool`. |
| `hasColumn` | Cache **information_schema** lookup. |
| `resolveRevenueExpression` | Quotation revenue: `total_sale_value` → else `final_price` → else `total_amount` → else `0`. |
| `getSoftDeleteClause` | Adds `is_deleted = false` filter if column exists. |
| `getStats` | **Current period** from `DATE_TRUNC` (day/week/month/year) to now; **previous period** = prior bucket of same length. Subqueries: **leads** count in window; **quotations** `SUM(revenue)` where **`status = 'APPROVED'`**; **pending_calls** count leads with `next_followup_date` rules + status in `OPEN`,`CONTACTED`,`WIP`,`FOLLOW_UP`; **bookings** count in window. On error or no raw SQL: **`DEFAULT_STATS`** (zeros). |
| `getRevenue` | **Bookings** `total_amount` sum by time slot; compares **current** window to **shifted previous** window (`today`/`week`/`month`/`year` SQL). Excludes **CANCELLED** + soft-deleted bookings if column exists. Returns array `{ name, revenue, last }`. |
| `getLeadSources` | Leads since period start; group by `TRIM(source)` or **`Unknown`**; **percentage** of total; order by count desc. |

---

## Input → processing → output

| Endpoint | Input | Processing | Output |
|----------|--------|------------|--------|
| **GET /test** | — | None | `{ message, timestamp }` |
| **GET /stats** | `?period=` | Executive KPI adapter **or** legacy SQL | KPI object + `source` + `*Change` fields |
| **GET /revenue** | `?range=` | Booking revenue buckets | Array of `{ name, revenue, last }` |
| **GET /lead-sources** | `?period=` | Lead `source` % | Array of `{ name, value }` (percent) |

---

## Business logic (simple terms)

- **Stats (legacy):** “This period” = from start of day/week/month/year (PostgreSQL `DATE_TRUNC`) until now. “Previous period” = the **immediately preceding** interval of the **same length**. Leads and bookings are counted by **`created_at`** in that window. **Revenue** is sum of **approved** quotations created in the window (column used varies). **Pending calls** counts leads that need follow-up (status in a fixed set and date rules)—**not** strictly limited to leads created in the period.
- **Stats (executive adapter):** Same high-level KPIs but numbers come from **`reports.executiveKpis`**; **pending calls** = pending + overdue followups from that service. Windows come from **JavaScript** `getWindowRange`, not the repository’s `DATE_TRUNC` logic—**two different time definitions** if both paths exist.
- **Revenue chart:** Non-cancelled **bookings**; compares current slot totals to **prior-period** bookings shifted so charts can show “vs last week” style **`last`** column.
- **Lead sources:** Share of leads **created since period start**, grouped by **`source`** string.

---

## Database operations

All **SELECT** (read-only). Tables: **`leads`**, **`quotations`**, **`bookings`**. Optional reads **`information_schema.columns`**.  
**No** INSERT / UPDATE / DELETE in this module.

---

## Validations and conditions

- **No Zod:** `period` / `range` are plain strings; invalid values fall back to defaults (**month** / **week**).
- **Auth:** Protected routes need **`requireAuth`** when `middlewares.requireAuth` is registered.
- **500** on thrown errors from service/repository (controller catch).
- If **`canUseRawQuery()`** is false: **zeros** or **empty arrays** for stats/revenue/sources.

---

## Side effects

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.error` on failures in controller/service/repository; `warn` on column inspect failure |
| **Events / email / notifications** | **None** |

---

## Example API request/response

**Stats** — `GET /api/dashboard/stats?period=month`  
Header: `Authorization: Bearer <token>`

```json
{
  "success": true,
  "data": {
    "totalLeads": 42,
    "totalLeadsChange": 12,
    "revenue": 125000.5,
    "revenueChange": -3,
    "pendingCalls": 7,
    "pendingCallsChange": 0,
    "bookings": 15,
    "bookingsChange": 8,
    "source": "legacy_dashboard_repository"
  }
}
```

(`source` is `executive_kpis_adapter` when the reports service supplies KPIs.)

**Revenue** — `GET /api/dashboard/revenue?range=week`

```json
{
  "success": true,
  "data": [
    { "name": "Mon", "revenue": 1200, "last": 900 },
    { "name": "Tue", "revenue": 0, "last": 1100 }
  ]
}
```

**Lead sources** — `GET /api/dashboard/lead-sources?period=month`

```json
{
  "success": true,
  "data": [
    { "name": "Website", "value": 45.2 },
    { "name": "Unknown", "value": 12.0 }
  ]
}
```

**Test** — `GET /api/dashboard/test` (no auth)

```json
{
  "message": "Dashboard module is working!",
  "timestamp": "2026-04-11T12:00:00.000Z"
}
```

---

## Notes for developers

- Response shape **`{ success, data }`** differs from some modules that return only **`{ data }`**.
- **`reportsService.executiveKpis`** changes **how** stats are computed and the **`source`** field; keep both code paths in mind when debugging “numbers don’t match.”
- **Repository** targets **PostgreSQL** (`DATE_TRUNC`, `generate_series`, `INTERVAL`). Other DBs: expect **default empty/zero** data unless you extend the repository.
- **`/test`** should not be relied on for production security—treat as a health/debug endpoint or protect at gateway if needed.
- Ensure **`bookings`** / **`quotations`** / **`leads`** schemas match expected columns (`created_at`, `status`, `source`, `next_followup_date`, etc.) for accurate SQL.
