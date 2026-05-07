# RBAC module

## 1. Module overview

**RBAC** (roles and permissions) controls what each CRM user can do. Each user has one **role** (`users.role_id`). Permissions are strings like `leads:read` or `*`. The table **`role_permissions`** links roles to permission rows. The module lives in `backend/crm/modules/rbac` and mounts **`/api/rbac`**, **`/api/permissions`**, and **`/api/roles`**. The database layer is **MySQL** (`mysql2`). The service uses **in-memory caches** (TTL from config, default 60s).

## 2. Flow (route → controller → service → repository)

```
rbac.routes.js (and permission/role routers)
  → rbac.controller.js
  → rbac.service.js (cache, wildcards, super-admin rules)
  → rbac.repository.js (SQL, introspection, upserts)
```

**`authorize(permissionKey)`** (`rbac.middleware.js`) runs on protected routes after **`requireAuth`**.

## 3. Step-by-step execution

1. **`requireAuth`** — JWT user on `req.context.user`.
2. **`authorize("rbac:manage")`** — loads permissions for the user; sets **`req.context.permissions`**.
3. **`requireSuperAdmin`** (where used) — only super-admin role for admin CRUD.
4. **`validateRequest`** — Zod for body/query/params.
5. **Controller → service → repository** (role **create/update** also uses **`dependencies.services.roles`** when configured).

**`GET /api/rbac/me/permissions`** — login only; returns current user’s permission list.

## 4. Function explanations (repository focus)

| Area | Role |
|------|------|
| **`getCapabilities`** | One query to **`information_schema.COLUMNS`** to see which optional columns exist (`key`, `name`, `is_active`, etc.). |
| **Roles** | `listRoles`, `findRoleById`, `findRoleByName`, **`ensureRole`** (`INSERT` + `ON DUPLICATE KEY UPDATE` on MySQL). |
| **Permissions** | `listPermissions`, `findPermissionById` / `findPermissionByKey`, **`createPermission`** (upsert on unique key), **`updatePermission`**. |
| **Links** | `getPermissionsByRoleId`, `getPermissionsByRoleIds`, `getPermissionsByRoles`; **`setRolePermissionsByRoleId`** (per-row upsert/delete); **`replaceRolePermissionsByRoleId`**; **`setRolePermissions`** (by role name + keys). |
| **Users** | `getRoleForUser`, `getRolesForUsers`, **`assignRoleById`** (`UPDATE users.role_id`), **`countActiveUsersByRoleId`**. |

(Service: caching, `assignRole` super-admin rule, events — see `rbac-module.md`.)

## 5. Request / response examples

**Current user permissions** — `GET /api/rbac/me/permissions`  
Header: `Authorization: Bearer <token>`

```json
{
  "data": {
    "roleId": "…",
    "role": "sales_consultant",
    "permissions": ["leads:read", "dashboard:read"]
  }
}
```

**Assign role** — `POST /api/rbac/assign` (super admin + `rbac:manage`)

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "roleId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Replace role permissions** — `PATCH /api/roles/:id/permissions`

```json
{
  "replace": true,
  "permissionIds": ["770e8400-e29b-41d4-a716-446655440002"]
}
```

## 6. Database tables used

| Table | Role |
|-------|------|
| `users` | `role_id` for assign. |
| `roles` | Role names, optional `country`, `is_active`. |
| `permissions` | Permission key (or `name` if no `key` column), optional description/active flags. |
| `role_permissions` | `(role_id, permission_id)` with optional `is_active` for soft-disable. |

Unique indexes on MySQL must match **`ON DUPLICATE KEY`** usage (typically unique on permission `key`, unique on `(role_id, permission_id)`).

## 7. Business rules

- One role per user (`users.role_id`).
- Middleware matches exact keys, **`*`**, or **`scope:*`** style wildcards.
- Only **one active** super-admin assignment at a time (`assignRole` in service).
- Admin catalog routes need **`rbac:manage`** + super admin (except **`/me/permissions`**).
- Cache invalidation on assign and permission/role-permission changes.

## 8. Developer notes

- **Env:** `MYSQL_*` (see `backend/crm/core/database/connection.js`) so `db.adapter === "mysql"` and introspection + upserts work.
- **Risky areas:** **`IN (?,?,…)`** must use one placeholder per value (fixed in repository); **`ON DUPLICATE KEY`** needs correct unique keys in schema; concurrent **`ensureRole`** / **`createPermission`** rely on duplicate handling.
- **JSON:** not used for core RBAC rows; optional metadata lives elsewhere.
- **Transactions:** repository uses sequential statements; no multi-statement transaction wrapper.
- Full HTTP map and service table: **`docs/modules/rbac-module.md`**.
