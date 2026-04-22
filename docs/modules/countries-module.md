# Countries module — developer guide

**Location:** `backend/crm/modules/countries`  
**Base URL:** `/api/countries` (mounted like other feature modules in `backend/crm/modules/index.js`)

Maintains a **reference list of countries** (`code`, `name`, `isActive`) for CRM settings. Supports **search**, optional **usage counts** (users + leads linked to the country), and **duplicate protection** on code and name.  
**RBAC uses settings permissions:** `settings:read` (list, get) and `settings:update` (create, patch) — not `countries:*`.

**Primary table:** `countries`. **Usage** queries also read `user_countries` and `leads` (`countries.schema.js`).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | JWT, `authorize`, Zod `validateRequest`, controller. |
| **Controller** | Passes query/body/params to service; **200** / **201**; optional **`includeUsage`** on get. |
| **Service** | Normalizes code (uppercase) and name (trim); duplicate checks; maps rows to API; **`created_by` / `updated_by`** from `context.user`; events. |
| **Repository** | Postgres-optimized list/search; case-insensitive **findByCode** / **findByName**; **countUsage** subqueries (Postgres only; else zeros). |

---

## Step-by-step flow

1. **`requireAuth`** — user on `req.context`.
2. **`authorize("settings:read" | "settings:update")`** — permission.
3. **`validateRequest`** — fills `req.validated`.
4. **Controller** → **service** (optional `includeUsage`, `context` on write).
5. **Service** → **repository** (`findAll`, `findById`, `findByCode`, `findByName`, `create`, `update`, `countUsage`).

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `settings:read` |
| GET | `/:id` | `settings:read` |
| POST | `/` | `settings:update` |
| PATCH | `/:id` | `settings:update` |

`GET /` is registered before `GET /:id`.

---

## Function-wise explanation

### `index.js` — `createCountriesModule`

Wires **repository**, **events**, **service**, **controller**, **router**. **No `logger` on service** (only repository logs).

### `countries.controller.js`

| Function | Purpose |
|----------|---------|
| `list` | `service.list(req.validated?.query \|\| req.query)` — **no** `req.context` passed. |
| `getById` | Reads **`includeUsage`** from validated query (boolean); `service.getById(id, { includeUsage })`. |
| `create` | `service.create(body, req.context)` — **201**. |
| `update` | `service.update(id, body, req.context)` — **200**. |

### `countries.service.js`

| Name | Purpose |
|------|---------|
| `normalizeCode` | Trim + **UPPERCASE**; empty → `null`. |
| `normalizeName` | Trim; empty → `null`. |
| `toCountry` | Row → `{ id, code, name, isActive, createdAt, updatedAt, usage? }`. |
| `requireCountry` | `findById`; **404** `COUNTRY_NOT_FOUND`. |
| `list` | `findAll({ includeInactive, search })`. **`includeInactive`** defaults to **including** inactive rows unless query sets `includeInactive` to **false** (`filters.includeInactive !== false`). |
| `getById` | `requireCountry`; if **`includeUsage`**, attach **`repository.countUsage`** as `usage: { usersCount, leadsCount }`. |
| `create` | Require code + name after normalize; **409** if code or name exists; `create` with `is_active`, `created_by`, `updated_by`; **`emitCreated`** with **mapped** camelCase object. |
| `update` | Partial fields; per-field duplicate checks excluding self; empty patch returns current row **without** DB write; sets `updated_by`, `updated_at`; **`emitUpdated`**. |

### `countries.repository.js`

| Function | Behavior |
|----------|----------|
| `findAll` | **Postgres:** SQL `WHERE` optional `is_active = TRUE`, optional `ILIKE` on name/code; `ORDER BY name ASC`. **Else:** load all, filter in memory, sort by name. |
| `findById` | `db.findById`. |
| `findByCode` / `findByName` | **Postgres:** `WHERE LOWER(...) = LOWER($1)`. **Else:** scan `findMany`. |
| `create` / `update` | `db.insert` / `db.update`. |
| `countUsage` | **Postgres:** two `COUNT(*)` subqueries on `user_countries` and `leads` by `country_id`. **Else:** `{ usersCount: 0, leadsCount: 0 }`. |

### `countries.validation.js` (Zod)

- **list:** optional `includeInactive` (coerced boolean), `search` 1–120 chars.
- **byId:** param `id` UUID; optional `includeUsage` boolean.
- **create:** `code` 2–10 chars, `name` 2–120, optional `isActive`.
- **update:** optional `code`, `name`, `isActive`; **at least one** field.

### `countries.events.js`

- **`countries.created`** / **`countries.updated`** — `logger.info` + `eventBus.emit`. Payload is **mapped** country from service (camelCase).

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Query: `includeInactive`, `search` | Filter + sort | Array of countries |
| **Get** | UUID; optional `includeUsage=true` | Load + optional usage counts | One country (+ `usage` if requested) |
| **Create** | `code`, `name`, optional `isActive` | Normalize, uniqueness, audit ids | **201** country |
| **Update** | UUID + ≥1 field | Uniqueness, merge updates | **200** country |

---

## Business logic (simple terms)

- Each country has a **short code** (stored uppercase) and a **display name**; both must be **unique** (case-insensitive match in DB layer).
- **List** can hide inactive rows and **filter by substring** on name or code.
- **Usage** answers “how many **users** (via `user_countries`) and **leads** point at this country?” — only meaningful on **Postgres** with those tables.
- **Audit:** create/update store **`created_by`** / **`updated_by`** from the logged-in user when present.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `countries` (list, get, duplicate checks) |
| **SELECT (usage)** | `user_countries`, `leads` (Postgres `countUsage` only) |
| **INSERT** | `countries` |
| **UPDATE** | `countries` |

---

## Validations and conditions

- Zod length bounds on `code` / `name`; update requires **≥1** field.
- Service: empty code/name after normalize → **400** `COUNTRY_CODE_REQUIRED` / `COUNTRY_NAME_REQUIRED`.
- Duplicate code or name → **409** `COUNTRY_CODE_EXISTS` / `COUNTRY_NAME_EXISTS`.
- **404** `COUNTRY_NOT_FOUND` for missing id.
- Update with only unchanged semantics still runs duplicate check when `code`/`name` sent; **no DB update** if `updates` is empty.

---

## Side effects

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.debug` on repository create/update |
| **Logs** | `logger.info` on events |
| **Event bus** | `countries.created`, `countries.updated` |
| **Email / notifications** | **None** in this module |

---

## Example API request/response

**List** — `GET /api/countries?includeInactive=false&search=ind`

**Get with usage** — `GET /api/countries/<uuid>?includeUsage=true`

```json
{
  "data": {
    "id": "...",
    "code": "IN",
    "name": "India",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "...",
    "usage": {
      "usersCount": 3,
      "leadsCount": 12
    }
  }
}
```

**Create** — `POST /api/countries`

```json
{
  "code": "us",
  "name": "United States",
  "isActive": true
}
```

Response **201**: `code` returned as **`US`** (normalized).

**Update** — `PATCH /api/countries/:id`

```json
{
  "name": "United States of America",
  "isActive": false
}
```

---

## Notes for developers

- Permissions are **`settings:read`** / **`settings:update`** — align frontend and RBAC seed data.
- **`includeInactive`:** omitted or true → inactive countries **included**; set **`false`** to show only active.
- **`countUsage`** returns **zeros** when **`db.adapter` is not `postgres`** — do not rely on usage for non-Postgres tests.
- Duplicate detection is **case-insensitive** for code and name in the repository; service stores **codes uppercase**.
- Service **`list`** does not receive **`req.context`** — no per-request logging of user id in that path unless you extend the controller.
