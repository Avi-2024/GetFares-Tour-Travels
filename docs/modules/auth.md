# Auth module

## 1. Module overview

The **auth** module handles registration, login, JWT issuance, the current-user profile, optional online presence (`users.active` when the column exists), and logout (with optional token blacklist). It lives under `backend/crm/modules/auth`. Data access goes only through **`auth.repository.js`**; the database is **MySQL** via `mysql2` (`backend/crm/core/database/connection.js`).

## 2. Flow: route → controller → service → repository

```
auth.routes.js
  → auth.controller.js (HTTP)
  → auth.service.js (hash, JWT, rules)
  → auth.repository.js (SQL via db adapter)
```

Middleware (`auth.middleware.js`) validates JWT for protected routes before the controller runs.

## 3. Step-by-step execution

1. **Register:** Validate body → service hashes password → repository ensures role exists → inserts `users` → service builds JWT + safe user object.
2. **Login:** Find user by email → verify password → repository inserts session row (`login_audit`) and updates `last_login` (and `active` if column exists) → JWT issued.
3. **Me:** JWT supplies user id → repository loads user and attaches role → serialized user returned.
4. **Toggle active / logout:** Load user → update presence or blacklist token → repository updates `users` as needed.

## 4. Function explanations (repository focus)

| Piece | Role |
|--------|------|
| `hasUsersColumn(name)` | One-time check in `information_schema.COLUMNS` whether `users` has optional columns (e.g. `active`). Uses `TABLE_SCHEMA = DATABASE()`. |
| `toDomainUser` / `attachRole` | Map DB row to API-safe shape; resolve `role_id` to role name/country via `roles` table. |
| `resolveRole(roleName)` | `findOne` on `roles`; if missing, `insert` role. On duplicate unique key, catches error and `findOne` again. |
| `createUser` | `insert` into `users` with `role_id`, `full_name`, `email`, `phone`, `password_hash`, `is_active`. |
| `findUserByEmail` / `findUserById` | `findOne` / `findById` on `users` + `attachRole`. |
| `saveSession` | `insert` into `login_audit` (session/audit row). |
| `markLogin` | `update` user `last_login` (+ `active` if column exists). |
| `setActiveStatus` / `clearLoginPresence` | `update` `updated_at` and optional `active`. |

(Service and controller details stay in code; this file focuses on repository + data.)

## 5. Request / response examples

**POST `/api/auth/register`** (shape; paths may vary by router mount)

```json
{
  "email": "user@example.com",
  "password": "secret",
  "fullName": "Test User",
  "role": "sales_consultant"
}
```

Typical success body (from service):

```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "fullName": "Test User",
      "role": "sales_consultant",
      "roleId": "..."
    }
  }
}
```

**POST `/api/auth/login`**

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response shape matches register success (`accessToken` + `user`).

## 6. Database tables used

| Table | Usage |
|--------|--------|
| `users` | Credentials, profile, `role_id`, `is_active`, `last_login`, optional `active`. |
| `roles` | Role name/description; referenced by `users.role_id`. |
| `login_audit` | Session rows from `saveSession` (`user_id`, `ip_address`, `device_info`, `login_time`). |

(Exact column list matches your MySQL schema migrated from the previous design.)

## 7. Important business rules

- Email is treated as unique (enforced in DB + service).
- Passwords are hashed (bcrypt) in the **service**, not the repository.
- JWT payload includes stable user identity and role claims (see `auth.service.js`).
- Optional `users.active` column: if absent, presence updates are skipped (repository logs a warning via logger).
- **Duplicate role name** on concurrent `resolveRole`: MySQL duplicate key is surfaced as `code === '23505'` from the DB adapter so the repository can retry `findOne`.

## 8. Notes for developers

- Set **`MYSQL_HOST`**, **`MYSQL_DATABASE`**, and optionally **`MYSQL_USER`**, **`MYSQL_PASSWORD`**, **`MYSQL_PORT`** for the CRM app pool (`connection.js`). If these are missing, the app falls back to an **in-memory** adapter (no raw SQL in auth introspection).
- **JSON:** Plain objects passed into generic `insert`/`update` are JSON-stringified for MySQL JSON columns in the shared adapter (`bindValueForMysql`).
- **Risky areas:** concurrent registration with the same new role name (mitigated by duplicate handling in `resolveRole`); optional `device_info` / JSON columns if schema uses JSON type.
- **Removed:** PostgreSQL / `pg` — use MySQL only; legacy scripts under `backend/scripts` that still referenced `pg` must be updated separately if you rely on them.
