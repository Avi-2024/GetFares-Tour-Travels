# Notifications module — developer guide

**Location:** `backend/crm/modules/notifications`  
**Base URL:** `/api/notifications`

Stores **in-app notification rows** in **`notification_events`**, pushes them through an **`eventPublisher`** (typically **Socket.IO** real-time delivery), and exposes **read / list / unread count** for the logged-in user. On startup it **subscribes** to a fixed list of **domain events** (leads, quotations, bookings, etc.) and turns each into notifications via **`captureDomainEvent`**.

**RBAC:** `notifications:read` (list, unread count), `notifications:update` (mark read, mark all read).

---

## High-level module overview

| Piece | Role |
|--------|------|
| **Routes** | Auth + `authorize` + Zod + controller. |
| **Controller** | Passes query/params + **`req.context`** (user) to service. |
| **Service** | **`publish`** / **`captureDomainEvent`** (create rows + deliver); **`listMine`**, **`getUnreadCount`**, **`markRead`**, **`markAllRead`**; builds **recipients** from domain + **`ROLE_BY_DOMAIN`**. |
| **Repository** | CRUD on **`notification_events`**; recipient matching for user/role/team; Postgres raw SQL when `db.query` + pool exist. |
| **Subscribers** | **`registerNotificationsSubscribers`** attaches **`eventBus.on`** for **`DOMAIN_EVENT_NAMES`** → **`service.captureDomainEvent`**. |
| **Events** (`notifications.events.js`) | Emits **`notifications.created`**, **`notifications.delivery_updated`**, **`notifications.read`**, **`notifications.read_all`** after DB changes. |

---

## Step-by-step flow

### HTTP (read inbox)

1. **`requireAuth`** → **`authorize`** → **`validateRequest`**.  
2. **Controller** → **service** (uses **`context.user.id`**, **`role`**, **`teamId`**).  
3. **Repository** selects rows where the user **matches** recipient (`userId`, `role`, or `teamId`) or **broadcast** rows (all recipient fields **null**).  
4. Returns JSON **`{ data: ... }`**.

### Creating notifications (domain-driven)

1. Another module does **`eventBus.emit("leads.created", payload)`** (example).  
2. **Subscriber** in **`notifications.subscribers.js`** calls **`service.captureDomainEvent({ eventName, payload })`**.  
3. **Service** derives **title/message**, **entity id**, **recipients** (`buildDomainRecipients`), then **`publish`** → for each target **`publishOne`**:  
   - **`repository.create`** → **`events.emitCreated`**  
   - **`eventPublisher.publish`** (real-time channel)  
   - **`repository.markDeliveryAttempt`** → **`emitDeliveryUpdated`**

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `notifications:read` |
| GET | `/unread-count` | `notifications:read` |
| PATCH | `/:id/read` | `notifications:update` |
| PATCH | `/read-all` | `notifications:update` |

Query: **list** supports **`page`**, **`limit`** (max 100), optional **`status`** (`PENDING`, `DELIVERED`, `READ`, `FAILED`).

---

## Function-wise explanation

### `notifications.controller.js`

| Method | Service |
|--------|---------|
| `listMine` | `listMine(query, context)` |
| `unreadCount` | `getUnreadCount(context)` |
| `markRead` | `markRead(params.id, context)` |
| `markAllRead` | `markAllRead(context)` |

### `notifications.service.js`

| Function | Purpose |
|----------|---------|
| `ensureUser` | **401** if no `context.user.id`. |
| `normalizeRecipients` / `buildRecipientTargets` | Split **`userIds`**, **`roles`**, **`teamIds`** into one DB row per target (empty recipients → one row with **all null** = broadcast). |
| `publish` | Loop targets; each **`publishOne`**. |
| `publishOne` | **INSERT** PENDING → **`emitCreated`** → **`eventPublisher.publish`** → **`markDeliveryAttempt`** (DELIVERED / FAILED / stay PENDING if socket deferred). |
| `buildDomainRecipients` | From event name: domain prefix → default **roles** from **`ROLE_BY_DOMAIN`** (e.g. `leads` → `manager` only); merges **user ids** extracted from payload (`assigneeId`, `assignedTo`, …). Special case: **`leads.followup_due_soon`** → **no extra roles** (user-only). |
| `captureDomainEvent` | Wraps **`publish`** with derived **entityType**, **entityId**, **title**, **message**. |
| `listMine` | Pagination via **`toPagination`**; loads **items**, **total**, **unreadCount** in parallel. |
| `getUnreadCount` | Count where **status ≠ READ** and recipient matches. |
| `markRead` | **404** if missing; **403** if **`isRecipientMatch`** fails; idempotent if already READ; **`emitRead`**. |
| `markAllRead` | Updates all non-READ for recipient; **`emitReadAll`**. |

### `notifications.repository.js`

| Function | Purpose |
|----------|---------|
| `toNotification` | Row → camelCase API object. |
| `isRecipientMatch` | User matches **direct id**, **role**, or **team**; rows with **all recipients null** match **everyone**. |
| `create` | Insert row (JSON **payload**, channel default path in service). |
| `findById` | By id. |
| `listForUser` / `countForUser` / `countUnreadForUser` | Postgres **SQL** or in-memory **findMany** fallback. |
| `markDeliveryAttempt` | Updates status/attempts/errors from **`eventPublisher`** result (defers increment for “no socket” style errors). |
| `markRead` / `markAllRead` | Set **READ** + timestamps. |

### `notifications.subscribers.js`

- **`DOMAIN_EVENT_NAMES`**: long allowlist (`auth.*`, `leads.*`, `quotations.*`, `bookings.*`, …).  
- Each name gets **`eventBus.on(eventName, listener)`**.  
- **`teardown()`** removes listeners (tests/shutdown).  
- Failures are **logged**; they do not crash the bus.

### `notifications.validation.js`

- **list:** optional pagination + **status** enum.  
- **markRead:** **`id`** string **min length 1** (not strictly UUID in schema).  
- **unreadCount** / **markAllRead:** empty body/params.

### `notifications.schema.js`

- **Table:** `notification_events`.  
- **Statuses:** `PENDING`, `DELIVERED`, `READ`, `FAILED`.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List mine** | `page`, `limit`, `status?` | Filter by current user identity + optional status | `{ items, unreadCount, pagination }` |
| **Unread count** | — | Count non-READ | `{ unreadCount }` |
| **Mark read** | Notification `id` | Ownership check → UPDATE | Updated row |
| **Mark all read** | — | Bulk UPDATE for matching recipient | `{ updated: n }` |

**Programmatic `publish`** (internal): `eventName`, `recipients`, optional `payload`, `title`, `message`, … → creates **N** rows + delivery attempts.

---

## Business logic (simple terms)

- Each **notification** is tied to an **event name** (e.g. `quotations.sent`) and optional **entity** (type + id).  
- **Who sees it:** rows addressed to **that user**, **that role name**, **that team**, or **everyone** (broadcast). Domain events **auto-add** role targets per **domain** plus any **user ids** found in the payload (assignee, etc.).  
- **Delivery:** After saving as **PENDING**, the **publisher** tries real-time push; status becomes **DELIVERED** or **FAILED**, or stays **PENDING** if delivery is deferred (e.g. no active socket).  
- **Read state** is a separate concern from delivery: user marks read → **READ** status.

---

## Database operations

| Operation | Table |
|-----------|--------|
| **INSERT** | `notification_events` |
| **SELECT** | `notification_events` (list/count) |
| **UPDATE** | `notification_events` (delivery fields, read, mark all read) |

---

## Validations and conditions

- Zod on HTTP layer; **401** without user on all endpoints.  
- **403** `NOTIFICATION_FORBIDDEN` if marking read on a row not visible to the user.  
- **404** `NOTIFICATION_NOT_FOUND` for bad id on mark read.

---

## Side effects

| Kind | Details |
|------|---------|
| **eventPublisher.publish** | Real-time delivery (Socket.IO or stub—depends on app **`dependencies.eventPublisher`**). |
| **Event bus (outbound)** | **`notifications.*`** events for other listeners. |
| **Event bus (inbound)** | **~40** domain event subscriptions create notifications automatically. |
| **Email / SMS** | **Not** sent by this module; could be triggered elsewhere listening to **`notifications.created`** or domain events. |

---

## Example API request/response

**List** — `GET /api/notifications?page=1&limit=20&status=DELIVERED`

```json
{
  "data": {
    "items": [
      {
        "id": "...",
        "eventName": "leads.created",
        "title": "Leads Created",
        "message": "leads event for <uuid>",
        "status": "DELIVERED",
        "payload": {},
        "createdAt": "..."
      }
    ],
    "unreadCount": 3,
    "pagination": { "page": 1, "limit": 20, "total": 42 }
  }
}
```

**Unread** — `GET /api/notifications/unread-count`  
→ `{ "data": { "unreadCount": 3 } }`

**Mark one read** — `PATCH /api/notifications/<id>/read`

**Mark all read** — `PATCH /api/notifications/read-all`

---

## Notes for developers

- **`dependencies.eventPublisher`** must be wired in **`registerModules`** (or notifications only persist rows and mark delivery outcomes).  
- **New domain event?** Add the string to **`DOMAIN_EVENT_NAMES`** in **`notifications.subscribers.js`** or it will **not** auto-notify.  
- **`ROLE_BY_DOMAIN`** maps event **prefix** → default **role names**; must align with your **RBAC seed** (`sales_consultant`, `manager`, …).  
- **`leads.followup_due_soon`** intentionally sets **roles** to **[]** so only **user ids** from the payload get targeted—avoid spamming all managers.  
- **Broadcast** rows (null recipients) are visible in **everyone’s** inbox queries—use sparingly from **`publish`**.  
- Module export includes **`subscribers.teardown()`** for tests or graceful shutdown if you need to unregister listeners.
