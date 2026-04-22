# Auth module — developer guide

**Location:** `backend/crm/modules/auth`  
**Base URL:** `/api/auth` (see `backend/crm/modules/index.js`)

Handles sign-up, sign-in, current user profile, online/presence flag (`active`), and logout (optional token blacklist). Uses Zod validation, rate limits on register/login, JWT access tokens, bcrypt passwords, session/audit rows, and event bus hooks.

**Tables:** `users`, `roles`, `login_audit` (`auth.schema.js`).

---

## 1. Flow: route → controller → service → repository

1. Request hits Express router (`auth.routes.js`).
2. Rate limiter runs on `POST /register` and `POST /login`.
3. `validateRequest` runs for register/login (Zod in `auth.validation.js`).
4. `requireAuth` runs for `/me`, `/toggle-active`, `/logout`: reads `Authorization: Bearer <token>`, verifies JWT, optionally checks blacklist (`auth.middleware.js` + `auth.service.js`).
5. Controller reads body/headers, sets HTTP status, calls **service**.
6. Service applies business rules (password hash, role resolution, errors), calls **repository** for DB, emits **events**, uses **token blacklist** if configured.
7. Repository maps rows to domain users, runs insert/update/select on `db`.

---

## 2. HTTP map

| Method | Path | Middleware |
|--------|------|------------|
| POST | `/register` | register rate limit → validate register → `register` |
| POST | `/login` | login rate limit → validate login → `login` |
| GET | `/me` | `requireAuth` → `me` |
| POST | `/toggle-active` | `requireAuth` → `toggleActive` |
| POST | `/logout` | `requireAuth` → `logout` |

---

## 3. Function reference

### `index.js` — `createAuthModule`

- **Purpose:** Wire repository, events, service, middleware, controller, router.
- **Dependencies:** `db`, `logger`, `config.auth`, `eventBus`, `middlewares.validateRequest`, optional `services.roles`, `services.tokenBlacklist`.
- **Exports:** `{ name, router, controller, service, repository, events, middleware }`.

### `auth.controller.js`

| Function | Purpose | I/O |
|----------|---------|-----|
| `register` | Create user + token | `req.validated.body` → **201** `{ data: { accessToken, user } }` |
| `login` | Issue token | Body + IP (`x-forwarded-for` or `req.ip`) + `User-Agent` → **200** same shape |
| `me` | Current user | `req.context.user.id` → **200** `{ data: user }` |
| `toggleActive` | Presence flag | Body `active` must be boolean → **400** if not → **200** user |
| `logout` | Revoke + clear presence | Bearer token + IP + UA → **200** `{ data: { success: true } }` |

### `auth.service.js`

| Function | Purpose |
|----------|---------|
| `serializeUser` | Safe user object for API (no password hash). |
| `verifyToken` | `jwt.verify`; **401** `AUTH_INVALID_TOKEN` on failure. |
| `buildAuthResponse` | JWT with `sub`, `email`, `role`, `roleId`, random **`jti`** → `{ accessToken, user }`. |
| `isTokenBlacklisted` | Decode JWT, check `jti` via `tokenBlacklistService` (false if unavailable). |
| `register` | Unique email → bcrypt hash → resolve role → `createUser` → `emitRegistered` → `buildAuthResponse`. |
| `login` | Find user → bcrypt → require `isActive` → `saveSession` + `markLogin` (warn on failure) → `emitLoggedIn` → `buildAuthResponse`. |
| `getProfile` | `findUserById` → **404** if missing → `serializeUser`. |
| `toggleActive` | `findUserById` → `setActiveStatus` → `serializeUser`. |
| `logout` | `findUserById` → blacklist by `jti` if configured → `clearLoginPresence` → `{ success: true }`. |

### `auth.repository.js`

| Function | DB |
|----------|-----|
| `hasUsersColumn` | **SELECT** `information_schema.COLUMNS` (`TABLE_SCHEMA = DATABASE()`, `TABLE_NAME`, `COLUMN_NAME`) — cached — for optional `users.active`. |
| `toDomainUser` / `attachRole` | Map DB row → domain; join role name/country. |
| `resolveRole` | **SELECT** role by name; **INSERT** if missing (handle duplicate `23505`). |
| `createUser` | **INSERT** `users`. |
| `findUserByEmail` / `findUserById` | **SELECT** + `attachRole`. |
| `saveSession` | **INSERT** `login_audit`. |
| `markLogin` | **UPDATE** `users` (`last_login`, `active=true` if column exists). |
| `setActiveStatus` | **UPDATE** `users` (`updated_at`, `active`). |
| `clearLoginPresence` | **UPDATE** `users` (`updated_at`, `active=false` if column exists). |

### `auth.middleware.js`

| Function | Purpose |
|----------|---------|
| `extractToken` | Parse `Bearer` from `Authorization`. |
| `optionalAuth` | Valid token → `req.context.user`; errors → `next()` without user. |
| `requireAuth` | Token required → verify → blacklist check → `req.context.user`. |

### `auth.validation.js` (Zod)

- **register:** `fullName` ≥2, `email`, `password` ≥8, optional `phone` 6–20, optional `role`, optional `roleId` (UUID).
- **login:** `email`, `password` ≥8.

### `auth.events.js`

- `emitRegistered` — log + `eventBus.emit("auth.registered", payload)`.
- `emitLoggedIn` — log + `eventBus.emit("auth.logged_in", payload)`.

No email/SMS in this module.

---

## 4. Input → processing → output (summary)

- **Register:** JSON body → validate → hash password → create user + role link → JWT + user JSON.
- **Login:** email/password → validate → verify hash + active → audit row + last login → JWT + user JSON.
- **Me:** Bearer token → JWT user id → load user → user JSON (no password).
- **Toggle active:** Bearer + `{ "active": boolean }` → update `users` presence fields → user JSON.
- **Logout:** Bearer → blacklist `jti` (if service) → clear presence → `{ success: true }`.

---

## 5. Business logic (simple terms)

- One email per account; password only stored hashed.
- Role from body or default; optional `rolesService` resolves `role` + `roleId`.
- Login uses same error for bad email and bad password.
- Inactive users (`is_active`) cannot log in.
- `active` on `users` (when column exists) acts like online/presence; logout clears it.
- JWT includes `jti` so logout can revoke until expiry if blacklist is enabled.

---

## 6. Database operations

| Action | Tables |
|--------|--------|
| **INSERT** | `users`, `roles` (auto-create by name), `login_audit` |
| **SELECT** | `users`, `roles`, `information_schema` (column probe) |
| **UPDATE** | `users` (last login, active, updated_at) |

---

## 7. Validations and conditions

- **409** `AUTH_EMAIL_EXISTS` — email already registered.
- **401** `AUTH_INVALID_CREDENTIALS` — wrong email/password (login).
- **403** `AUTH_INACTIVE_USER` — `is_active` false.
- **401** `AUTH_TOKEN_REQUIRED` / `AUTH_INVALID_TOKEN` / `TOKEN_REVOKED` — auth middleware.
- **404** `AUTH_USER_NOT_FOUND` — profile/toggle/logout user missing.
- **400** `VALIDATION_ERROR` — `toggleActive` when `active` is not a boolean (or other request validation failures).
- Missing **`users.active`** column: updates may skip `active`; warnings in logs.

---

## 8. Side effects

- **Logging:** info on events; warnings on audit/blacklist failures.
- **Event bus:** `auth.registered`, `auth.logged_in` (other modules can subscribe).
- **Token blacklist:** optional; logout stores `jti` with reason `USER_LOGOUT`.
- **Rate limiting:** `core/middlewares/rateLimiter.js` (not inside `auth/`).

---

## 9. Example requests/responses

### Register — `POST /api/auth/register`

```http
Content-Type: application/json
```

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "phone": "+1234567890"
}
```

```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "...",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "role": "...",
      "roleId": "...",
      "roleCountry": null,
      "agentCountry": null,
      "country": null,
      "agentType": null,
      "isActive": true,
      "active": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

Status: **201**

### Login — `POST /api/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

Response shape same as register. Status: **200**

### Me — `GET /api/auth/me`

Header: `Authorization: Bearer <accessToken>`

```json
{
  "data": { "...": "user fields" }
}
```

### Toggle active — `POST /api/auth/toggle-active`

Header: `Authorization: Bearer <accessToken>`

```json
{ "active": false }
```

### Logout — `POST /api/auth/logout`

Header: `Authorization: Bearer <accessToken>`

```json
{
  "data": { "success": true }
}
```

---

## 10. Notes for developers

- Mount **`dependencies.services.roles`** for consistent role resolution on register.
- **`tokenBlacklist`** enables post-logout revocation; tokens must carry **`jti`** (set in `buildAuthResponse`).
- **`users.active`** is optional; UI “online” behavior depends on migration/schema.
- **`login_audit`** holds IP and user-agent for login tracking.
- Listen for **`auth.registered`** / **`auth.logged_in`** for notifications, analytics, or onboarding flows.
- **MySQL:** CRM uses `mysql2` (`backend/crm/core/database/connection.js`). Set **`MYSQL_HOST`**, **`MYSQL_DATABASE`**, and optionally **`MYSQL_USER`**, **`MYSQL_PASSWORD`**, **`MYSQL_PORT`**. Duplicate key on concurrent role insert is normalized to **`23505`** so `resolveRole` can retry. See also `docs/modules/auth.md`.

---

## 11. Implementation status (this repo)

| Area | Status |
|------|--------|
| Routes + rate limits (`auth.routes.js`) | Implemented |
| Zod validation (`auth.validation.js`) | Implemented |
| Controller HTTP codes (`auth.controller.js`) | Implemented; `toggleActive` uses `AppError` + `VALIDATION_ERROR` for non-boolean `active` |
| Service (JWT, bcrypt, errors, blacklist, events) | Implemented |
| Repository (MySQL-friendly introspection, CRUD) | Implemented |
| Middleware (`requireAuth`, blacklist check) | Implemented |
| Events (`auth.registered`, `auth.logged_in`) | Implemented |

This document describes the **live** auth module; behavior should match sections 1–9 above.
