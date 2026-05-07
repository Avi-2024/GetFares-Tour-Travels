# Complaints module — developer guide

**Location:** `backend/crm/modules/complaints`  
**Base URL:** `/api/complaints` (mounted like other feature modules in `backend/crm/modules/index.js`)

Tracks **customer complaints** (optionally linked to a **booking**), with **status**, **assignment**, **description**, and an **activity log** (notes). Uses **RBAC**: `complaints:read`, `complaints:create`, `complaints:update`. Emits **event bus** events for integrations; **no email or push** inside this module.

**Tables:** `complaints`, `complaint_activities` (`complaints.schema.js`).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | JWT (`requireAuth`), permission (`authorize`), Zod (`validateRequest`), then controller. |
| **Controller** | Maps `req.validated` + `req.context` to service; sets **200** / **201**. |
| **Service** | Maps API ↔ DB field names, loads complaint before update/activities, maps rows to API shape, fires **events**. |
| **Repository** | Thin wrapper: `findMany` / `findById` / `insert` / `update` on `complaints`; activities on `complaint_activities`. |

---

## Step-by-step flow

1. **`requireAuth`** — attaches user to `req.context`.
2. **`authorize("complaints:...")`** — checks permission.
3. **`validateRequest(schema)`** — fills `req.validated` (body, params, query).
4. **Controller** calls **service** with ids, body, query, **`req.context`**.
5. **Service** validates existence (**404**), maps payloads, calls **repository**.
6. **Repository** uses shared **`db`** helpers (`findMany`, `findById`, `insert`, `update`).

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `complaints:read` |
| GET | `/:id` | `complaints:read` |
| GET | `/:id/activities` | `complaints:read` |
| POST | `/` | `complaints:create` |
| PATCH | `/:id` | `complaints:update` |
| POST | `/:id/activities` | `complaints:update` |

**Route order:** `GET /` is registered before `GET /:id`, so list is not captured as an id.

---

## Function-wise explanation

### `index.js` — `createComplaintsModule`

Builds **repository**, **events**, **service**, **controller**, **router**.  
**Dependencies:** `db`, `logger`, `eventBus`, `validateRequest`, `requireAuth`, `authorize`.

### `complaints.controller.js`

| Function | Purpose |
|----------|---------|
| `list` | List complaints with optional query filters. |
| `getById` | Single complaint by UUID. |
| `create` | New complaint (**201**). |
| `update` | Partial update (**200**). |
| `listActivities` | Paginated activity notes for a complaint. |
| `createActivity` | Add note to complaint (**201**). |

### `complaints.service.js`

**Internal mappers**

| Name | Purpose |
|------|---------|
| `mapListFilters` | Maps query (`assignedTo`, `bookingId`, `page`, `limit`, `status`) → DB keys (`assigned_to`, `booking_id`, …). |
| `mapCreatePayload` | Body → insert row: `booking_id`, `assigned_to`, `issue_type`, `description`, `status`. |
| `mapUpdatePayload` | Body → update row (same snake_case fields). |
| `toComplaint` | DB row → API: `bookingId`, `assignedTo`, `issueType`, … |
| `toComplaintActivity` | Activity row → API: `complaintId`, `userId`, `note`, `createdAt`. |

**Methods**

| Method | Purpose |
|--------|---------|
| `list` | `repository.findAll(mappedFilters)` → array of `toComplaint`. |
| `getById` | `findById`; **404** `COMPLAINTS_NOT_FOUND` if missing. |
| `create` | `repository.create` → **`emitCreated`** (payload is raw inserted row) → `toComplaint`. |
| `update` | **`getById`** first → `repository.update` → **`emitUpdated`** → `toComplaint`. |
| `listActivities` | **`getById`** → `repository.findActivities` with `page`/`limit` → map rows. |
| `createActivity` | **`getById`** → `createActivity` with `complaint_id`, `user_id` = `body.userId` **or** `context.user.id`, `note` → **`emitActivityAdded`** or fallback **`emitUpdated({ id })`** → `toComplaintActivity`. |

### `complaints.repository.js`

| Function | DB |
|----------|-----|
| `findAll` | **SELECT** many `complaints` (filters passed through to `db.findMany`). |
| `findById` | **SELECT** one by id. |
| `create` | **INSERT** `complaints`. |
| `update` | **UPDATE** `complaints` by id. |
| `findActivities` | **SELECT** many `complaint_activities` where `complaint_id` + pagination fields. |
| `createActivity` | **INSERT** `complaint_activities`. |

No soft-delete or joins: **simple CRUD**.

### `complaints.validation.js` (Zod)

- **Status:** `OPEN` \| `IN_PROGRESS` \| `RESOLVED`.
- **Create:** optional `bookingId`, `assignedTo` (UUIDs); `issueType` 2–150 chars; `description` 5–4000; optional `status`.
- **Update:** any subset; **at least one field** required.
- **createActivity:** `note` 2–2000 chars; optional `userId` (else server uses logged-in user in service).

### `complaints.events.js`

| Event | When |
|-------|------|
| `complaints.created` | After insert |
| `complaints.updated` | After complaint patch |
| `complaints.activity_added` | After new activity (or `complaints.updated` with `{ id }` if emitter missing) |

Each also writes a **structured log** line.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Query: `page`, `limit`, `status`, `assignedTo`, `bookingId` | Map keys → `findAll` | Array of complaints (camelCase) |
| **Get** | `id` param | `findById` | One complaint or **404** |
| **Create** | Body | Insert | **201** complaint |
| **Update** | `id` + partial body | Ensure exists → update | **200** complaint |
| **List activities** | `id` + optional `page`/`limit` | Ensure exists → `findActivities` | Array of activities |
| **Create activity** | `id` + `note` (+ optional `userId`) | Ensure exists → insert activity | **201** activity |

---

## Business logic (simple terms)

- A **complaint** is a ticket: **what** (`issueType`), **details** (`description`), **workflow** (`status`), optional **booking** link, optional **assignee**.
- **Activities** are **timeline notes** (who: `userId` from body or current user).
- **No** automatic status changes when adding an activity — status changes only via **PATCH** complaint.
- **No** validation that `bookingId` or `assignedTo` exist in other tables — only UUID format (when present). Enforcing real FKs is a **database** or future enhancement concern.

---

## Database operations

| Operation | Table |
|-----------|--------|
| **SELECT** | `complaints` (list, get) |
| **INSERT** | `complaints`, `complaint_activities` |
| **UPDATE** | `complaints` |

---

## Important validations and conditions

- All IDs in routes/body **UUID** (Zod).
- **Update** rejects empty body (“at least one field”).
- **404** `COMPLAINTS_NOT_FOUND` when id missing for get/update/activities.
- **Permissions:** wrong role → **403** from `authorize` (not in this module).

---

## Side effects

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.debug` on list/get/create/update/activities |
| **Event bus** | `complaints.created`, `complaints.updated`, `complaints.activity_added` |
| **Email / SMS / WhatsApp** | **None** in this module |

Downstream listeners can trigger notifications.

---

## Example API request/response

**Create** — `POST /api/complaints`

```json
{
  "bookingId": "550e8400-e29b-41d4-a716-446655440000",
  "assignedTo": "660e8400-e29b-41d4-a716-446655440001",
  "issueType": "Hotel quality",
  "description": "Room did not match photos from booking.",
  "status": "OPEN"
}
```

```json
{
  "data": {
    "id": "...",
    "bookingId": "...",
    "assignedTo": "...",
    "issueType": "Hotel quality",
    "description": "...",
    "status": "OPEN",
    "createdAt": "..."
  }
}
```

**Update** — `PATCH /api/complaints/:id`

```json
{
  "status": "IN_PROGRESS",
  "assignedTo": "770e8400-e29b-41d4-a716-446655440002"
}
```

**Add activity** — `POST /api/complaints/:id/activities`

```json
{
  "note": "Called customer; awaiting hotel response."
}
```

**List** — `GET /api/complaints?status=OPEN&assignedTo=<uuid>&page=1&limit=20`

**Activities** — `GET /api/complaints/:id/activities?page=1&limit=50`

---

## Notes for developers

- **Event payloads** for `emitCreated` / `emitUpdated` use **repository row shape** (often **snake_case**); consumers should normalize if needed.
- **`create` in service** does not receive `context` — only repository create; **creator user** is **not** stored on the complaint row in this module (only activity `user_id`).
- **`db.findMany`** behavior for `page`/`limit` depends on **global DB adapter** — confirm pagination works in your project.
- To enforce **booking exists** or **assignee is a user**, add checks in **service** or DB **foreign keys**.
- Register **listeners** on `complaints.*` for Slack/email if required.
