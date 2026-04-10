# Destinations module — developer guide

**Location:** `backend/crm/modules/destinations`  
**Base URL:** `/api/destinations` (mounted with other feature modules in `backend/crm/modules/index.js`)

Manages **travel destinations** (`name`, `country`, `isActive`) and **versioned pricing rows** per destination (`baseCost`, profit %, tax %, validity window). List/detail enrich destinations with **“current” pricing** (best row valid for **today**).  
**Auth:** all routes use **`requireAuth`**. **Writes** (`POST`/`PATCH` on destinations and pricing) also need **`settings:update`**. **Reads** (`GET` list, get by id, list pricing) have **no** `authorize` beyond login.

**Tables:** `destinations`, `destination_pricing` (`destinations.schema.js`).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | Zod validation; `authorize("settings:update")` only on mutating routes. |
| **Controller** | Passes `req.validated` + `req.context`; **`getById`** always asks service for **pricing included** (`includePricing: true`). |
| **Service** | Duplicate **name** check (case-insensitive); **current pricing** selection; date range checks; maps DB ↔ API; **events**. |
| **Repository** | CRUD on two tables; bulk pricing fetch for many destination ids (Postgres `ANY` or per-id `findMany`). |

---

## Step-by-step flow

1. **`requireAuth`** → optional **`authorize("settings:update")`** on writes.  
2. **`validateRequest`** → **`req.validated`**.  
3. **Controller** → **service**.  
4. **Service** → **repository**; may sort/filter in memory (search, current pricing).  
5. **Response:** `{ data: ... }` with **200** / **201**.

---

## HTTP map

| Method | Path | Extra auth |
|--------|------|------------|
| GET | `/` | — |
| GET | `/:id` | — |
| POST | `/` | `settings:update` |
| PATCH | `/:id` | `settings:update` |
| GET | `/:id/pricing` | — |
| POST | `/:id/pricing` | `settings:update` |
| PATCH | `/pricing/:pricingId` | `settings:update` |

---

## Function-wise explanation

### `index.js` — `createDestinationsModule`

Wires **repository**, **events**, **service**, **controller**, **router** (`db`, `logger`, `eventBus`, middlewares).

### `destinations.controller.js`

| Handler | Service call |
|---------|----------------|
| `list` | `service.list(query, context)` |
| `getById` | `service.getById(id, { includePricing: true }, context)` → includes **`pricing`** array + **`currentPricing`** on root |
| `createDestination` | `service.createDestination(body, context)` |
| `updateDestination` | `service.updateDestination(id, body, context)` |
| `listPricing` | `service.listPricing(id, context)` |
| `createPricing` | `service.createPricing(id, body, context)` |
| `updatePricing` | `service.updatePricing(pricingId, body, context)` |

### `destinations.service.js`

| Name | Purpose |
|------|---------|
| `normalizeText` | Trim; empty → `null`. |
| `toIsoDate` | Date input → `YYYY-MM-DD` or `null`. |
| `toDestination` | Row → API object + optional **`currentPricing`**. |
| `toPricing` | Row → API pricing object (numbers for costs/%). |
| `comparePricingRowsDesc` | Sort by `validFrom` desc, then `createdAt` desc. |
| `pickCurrentPricing` | From all rows for a destination, pick row **valid for today** (open-ended ranges allowed); else **newest** row. |
| `ensureValidDateRange` | **400** if `validFrom > validTo`. |
| `requireDestination` | **404** `DESTINATION_NOT_FOUND`. |
| `list` | Load destinations (optional `isActive` filter); **search** filters name/country in memory; sort by name; load all pricing for ids; attach **current** pricing per row. |
| `getById` | Load destination; if `includePricing`, load all pricing rows, sort **newest `validFrom` first**, map to array; root **`currentPricing`** = **`pricing[0]`** (newest window), **not** the same calendar rule as **`list`**. |
| `createDestination` | Duplicate name (case-insensitive); `createDestination` repo; **`emitCreated`**. |
| `updateDestination` | Duplicate name excluding self; partial update; empty patch returns existing; **`emitUpdated`**. |
| `listPricing` | Sorted pricing rows for destination. |
| `createPricing` | Date range check; `created_by` from user; **`emitPricingCreated`**. |
| `updatePricing` | Load by id; merge dates; **`emitPricingUpdated`** (+ `updatedBy` in payload). |

### `destinations.repository.js`

| Function | DB |
|----------|-----|
| `findDestinations` | **SELECT** many with optional `is_active`. |
| `findDestinationById` | **SELECT** by id. |
| `createDestination` / `updateDestination` | **INSERT** / **UPDATE** `destinations`. |
| `findPricingByDestinationId` | **SELECT** by `destination_id`. |
| `findPricingForDestinationIds` | **SELECT** where `destination_id = ANY($1::uuid[])` (Postgres) or batch `findMany`. |
| `findPricingById` | **SELECT** pricing by id. |
| `createPricing` / `updatePricing` | **INSERT** / **UPDATE** `destination_pricing`. |

### `destinations.validation.js`

- **Destination:** `name` required on create; optional `country`, `isActive`; patch needs ≥1 field.
- **Pricing:** nonnegative `baseCost`; profit/tax 0–100; optional `validFrom`/`validTo`; **validTo ≥ validFrom**.
- **List query:** optional `search`, `isActive` (coerced from string `"true"`/`"false"`).

### `destinations.events.js`

| Event | When |
|-------|------|
| `destinations.created` | After create destination |
| `destinations.updated` | After patch destination |
| `destinations.pricing.created` | After create pricing |
| `destinations.pricing.updated` | After patch pricing |

No `logger.info` in events file—only **`eventBus.emit`** with try/catch warn on failure.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | `search`, `isActive`, `page`/`limit` (limit not applied in service—passed to repo only as filters?) | Repo filters `isActive` only; search in service | Destinations + **currentPricing** via `pickCurrentPricing` |
| **Get** | `id` | Load + all pricing rows | Destination + **`pricing`** array + **currentPricing** = latest row by sort (see note above) |
| **Create destination** | `name`, optional `country`, `isActive` | Duplicate check | **201** |
| **Patch destination** | ≥1 field | Duplicate name check | **200** |
| **List pricing** | `destinationId` | Exists + sort | Array |
| **Create pricing** | costs, %, dates | Range check; `created_by` | **201** |
| **Patch pricing** | `pricingId`, partial | Exists; range check | **200** |

---

## Business logic (simple terms)

- Each **destination** must have a **unique name** (case-insensitive).
- **Pricing** rows hold commercial parameters and an optional **validity window**. Creating/updating enforces **validFrom ≤ validTo** when both set.
- **List** view picks **one** “current” price using **today’s date** inside `[validFrom, validTo]` when possible.
- **Get by id** returns **all** pricing rows sorted newest-first and sets **currentPricing** to the **first row after that sort** (not the same “today” rule as list)—see developer notes.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `destinations`, `destination_pricing` |
| **INSERT** | `destinations`, `destination_pricing` |
| **UPDATE** | `destinations`, `destination_pricing` |

---

## Validations and conditions

- Zod on all bodies/queries; empty strings → `undefined` for optional text/dates.
- Service: **409** `DESTINATION_DUPLICATE`; **404** destination/pricing; **400** name empty, bad date range (`DESTINATION_PRICING_INVALID_DATE_RANGE`).
- Patch with no effective fields returns **existing** entity without DB write (destination + pricing).

---

## Side effects

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.debug` in service/repository |
| **Event bus** | Four events (see above) |
| **Email / notifications** | **None** in-module |

---

## Example API request/response

**Create destination** — `POST /api/destinations`

```json
{
  "name": "Bali",
  "country": "Indonesia",
  "isActive": true
}
```

**Create pricing** — `POST /api/destinations/:id/pricing`

```json
{
  "baseCost": 50000,
  "minProfitPercent": 10,
  "recommendedProfitPercent": 15,
  "taxPercent": 5,
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31"
}
```

**Get destination** — `GET /api/destinations/:id`

```json
{
  "data": {
    "id": "...",
    "name": "Bali",
    "country": "Indonesia",
    "isActive": true,
    "createdAt": "...",
    "currentPricing": { "...": "first row after newest-first sort" },
    "pricing": [ { "...": "..." } ]
  }
}
```

**List** — `GET /api/destinations?search=bal&isActive=true`

---

## Notes for developers

- **RBAC:** Writes require **`settings:update`** (same pattern as **countries**). Readers only need a valid session for GETs.
- **Pagination:** Query may include **`page`/`limit`** in validation, but **list** implementation loads **all** destinations from repo then filters—verify whether your **`db.findMany`** honors limit or if large catalogs need repository-level pagination.
- **Current pricing mismatch:** **`list`** uses **calendar-aware** `pickCurrentPricing`; **`getById`** uses **newest `validFrom`** as `currentPricing`. Align UI/docs or refactor if one behavior is intended everywhere.
- **Pricing patch URL** uses **`/pricing/:pricingId`**, not nested under destination id—client must pass the **pricing row UUID**.
- Events omit structured **`logger.info`** on success (unlike some modules); rely on **eventBus** listeners for audit.
