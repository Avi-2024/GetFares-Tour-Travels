# Employees module — developer guide

**Location:** `backend/crm/modules/employees`  
**Base URL:** `/api/employees` (mounted with other feature modules in `backend/crm/modules/index.js`)

HR-style features on top of **`users`**: **directory** listing, **attendance** check-in/out (per user per day), and **leave** requests with status workflow. Uses **`attendance`** and **`leaves`** tables plus **`users`** updates (`is_on_leave`).  
**RBAC:** `employees:read` (directory, list attendance, list leaves) and `employees:update` (check-in/out, create leave, patch leave status).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | Auth + `authorize` + Zod `validateRequest` + controller. |
| **Controller** | Passes `req.validated` and `req.context` to service; **200** / **201**. |
| **Service** | Resolves **userId** (body or logged-in user); validates user exists; attendance rules (one open check-in per day); leave date order; status enum; syncs **`users.is_on_leave`** when leave status changes. |
| **Repository** | Thin `db` CRUD on `users`, `attendance`, `leaves`. |

---

## Step-by-step flow

1. **`requireAuth`** → **`authorize(...)`**  
2. **`validateRequest`** → **`req.validated`**  
3. **Controller** → **service**  
4. **Service** → **repository** (`findMany` / `findById` / `insert` / `update`)  
5. **Events** on check-in, check-out, leave create, leave status update  

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/directory` | `employees:read` |
| POST | `/attendance/check-in` | `employees:update` |
| POST | `/attendance/check-out` | `employees:update` |
| GET | `/attendance` | `employees:read` |
| GET | `/leaves` | `employees:read` |
| POST | `/leaves` | `employees:update` |
| PATCH | `/leaves/:id/status` | `employees:update` |

Specific paths are registered **before** any generic `/:id` would matter; there is no `GET /:id` here.

---

## Function-wise explanation

### `index.js` — `createEmployeesModule`

Wires **repository**, **events**, **service**, **controller**, **router** (`db`, `logger`, `eventBus`, middlewares).

### `employees.controller.js`

| Handler | Service |
|---------|---------|
| `directory` | `service.directory(query, context)` |
| `checkIn` | `service.checkIn(body, context)` → **201** |
| `checkOut` | `service.checkOut(body, context)` → **200** |
| `listAttendance` | `service.listAttendance(query, context)` |
| `listLeaves` | `service.listLeaves(query, context)` |
| `createLeave` | `service.createLeave(body, context)` → **201** |
| `updateLeaveStatus` | `service.updateLeaveStatus(params.id, body, context)` |

### `employees.service.js`

| Name | Purpose |
|------|---------|
| `toDateOnly` | ISO date string `YYYY-MM-DD`. |
| `toUser` / `toAttendance` / `toLeave` | DB row → camelCase API. |
| `ensureUser` | **404** `EMPLOYEE_USER_NOT_FOUND` if user id missing in `users`. |
| `directory` | `findDirectory` with mapped filters (`is_active`, `is_on_leave`, `email`, `page`, `limit`). |
| `checkIn` | **`userId`** = `payload.userId` **or** `context.user.id`; **400** if neither. Ensures user; **date** = payload or **today**; rejects if an attendance row for that user+date has **no** `check_out` (**409** `EMPLOYEE_ALREADY_CHECKED_IN`). Inserts row with `check_in` (payload or **now**). **`emitAttendanceCheckIn`**. |
| `checkOut` | Same user resolution; must find an **open** row (no `check_out`) for that day (**404** `EMPLOYEE_CHECKIN_NOT_FOUND`). Sets `check_out`. **`emitAttendanceCheckOut`**. |
| `listAttendance` | `findAttendance` with optional `userId`, `date`, pagination. |
| `listLeaves` | `findLeaves` with optional `userId`, `status`, pagination. |
| `createLeave` | **`userId`** from body or context; **endDate ≥ startDate**; status **PENDING**; **`emitLeaveCreated`**. |
| `updateLeaveStatus` | Load leave; normalize **status** to uppercase; must be in `PENDING`/`APPROVED`/`REJECTED`/`CANCELLED`; update leave row; **update user** `is_on_leave` = **`true` only when status is `APPROVED`**, else **`false`**; **`emitLeaveUpdated`** (includes `updatedBy`). |

### `employees.repository.js`

| Function | Table |
|----------|--------|
| `findDirectory` | `users` (`findMany`) |
| `findUserById` / `updateUser` | `users` |
| `findAttendance` / `createAttendance` / `updateAttendance` | `attendance` |
| `findAttendanceById` | `attendance` (unused by service in current code) |
| `findLeaves` / `findLeaveById` / `createLeave` / `updateLeave` | `leaves` |

### `employees.validation.js` (Zod)

- **directory:** optional `page`, `limit`, `email`, `isActive`, `isOnLeave`.
- **checkIn / checkOut:** body **optional**; optional `userId`, `date`, `checkIn` / `checkOut` strings.
- **listAttendance / listLeaves:** pagination + filters.
- **createLeave:** `startDate`, `endDate` (dates), optional `reason`, optional `userId`.
- **updateLeaveStatus:** param `id` UUID; body `status` (enum).

### `employees.events.js`

| Event | When |
|-------|------|
| `employees.attendance_check_in` | After check-in |
| `employees.attendance_check_out` | After check-out |
| `employees.leave_created` | After leave insert |
| `employees.leave_updated` | After leave status patch |

Each logs **`logger.info`** then **`eventBus.emit`**.

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **Directory** | Query filters | `findMany` users | Array of user-shaped objects |
| **Check-in** | Optional `userId`, `date`, `checkIn` | User exists; no open attendance that day | New attendance row (**201**) |
| **Check-out** | Optional `userId`, `date`, `checkOut` | Open row exists | Updated attendance (**200**) |
| **List attendance** | `userId`, `date`, `page`, `limit` | Query `attendance` | Array |
| **List leaves** | `userId`, `status`, pagination | Query `leaves` | Array |
| **Create leave** | Dates + optional reason + optional `userId` | User exists; dates valid | Leave **PENDING** (**201**) |
| **Update leave status** | Leave id + `status` | Update leave + sync **`users.is_on_leave`** | Updated leave (**200**) |

---

## Business logic (simple terms)

- **Directory** is a filtered view of **`users`** (employee profile fields like name, email, targets, expertise, flags).
- **Attendance:** One **open** session per user per **calendar day** (no checkout yet). Check-in creates a row; check-out fills **`check_out`** on that row.
- **Leave:** New requests start **PENDING**. Approving sets the employee’s **`is_on_leave`** to **true**; any other resolved status sets it to **false** (including **REJECTED** / **CANCELLED** / **PENDING** if ever set via API).

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `users`, `attendance`, `leaves` |
| **INSERT** | `attendance`, `leaves` |
| **UPDATE** | `attendance` (check-out), `leaves` (status), `users` (`is_on_leave`) |

---

## Validations and conditions

- Zod enums and optional UUIDs/dates.
- Service: **400** missing `userId` when body+context lack it; **404** user / check-in / leave; **409** double check-in; **400** bad leave dates or invalid status.
- **`is_on_leave`** is driven only when **leave status** is updated, not when attendance changes.

---

## Side effects

| Kind | Behavior |
|------|----------|
| **Logs** | `logger.debug` (service), `logger.debug` (repo), **`logger.info`** on events |
| **Event bus** | Four `employees.*` events (payloads use **camelCase** mappers) |
| **Email / push** | **None** in this module |

---

## Example API request/response

**Directory** — `GET /api/employees/directory?isActive=true&limit=50`

**Check-in** — `POST /api/employees/attendance/check-in`

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2026-04-11",
  "checkIn": "2026-04-11T09:30:00.000Z"
}
```

Omit **`userId`** to use the **logged-in** user.

**Check-out** — `POST /api/employees/attendance/check-out`

```json
{
  "date": "2026-04-11",
  "checkOut": "2026-04-11T18:00:00.000Z"
}
```

**Create leave** — `POST /api/employees/leaves`

```json
{
  "startDate": "2026-04-20",
  "endDate": "2026-04-22",
  "reason": "Personal"
}
```

**Update leave status** — `PATCH /api/employees/leaves/<leaveId>/status`

```json
{
  "status": "APPROVED"
}
```

---

## Notes for developers

- **`checkIn` / `checkOut` validation** allows an **empty** body; service then requires **`context.user`** for **`userId`** or returns **400**.
- Pagination **`page`/`limit`** behavior depends on the shared **`db.findMany`** implementation—confirm it applies limits for large datasets.
- **`updateLeaveStatus`** sets **`is_on_leave`** from **approval only**; time-based auto clear is **not** implemented here.
- **`findAttendanceById`** in the repository is **unused** by the service—safe to ignore or use in future refactors.
- Subscribe to **`employees.*`** events for Slack/email reminders; none are sent inside this module.
