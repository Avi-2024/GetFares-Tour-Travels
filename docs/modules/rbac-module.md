# RBAC module — developer guide

**Location:** `backend/crm/modules/rbac`  
**Mount paths:** `app.use("/api/rbac", …)`, `app.use("/api/permissions", …)`, `app.use("/api/roles", …)` (see `backend/crm/modules/index.js`).

**Purpose:** **Roles** and **permissions** for the CRM. Users have one **role** (`users.role_id`). Permissions are strings like `leads:read` or `*`. The **join table** `role_permissions` links roles to permission rows. Runtime checks use **in-memory caches** (TTL from config, default **60s**).

---

## High-level module overview

| Piece | Role |
|--------|------|
| **`rbac.routes.js`** | Three routers: legacy **`/api/rbac/*`**, plus **`/api/permissions`** and **`/api/roles`** for admin UI. Most admin routes need **`rbac:manage`** **and** **super admin** (see below). |
| **`rbac.controller.js`** | Thin: forwards validated body/params/query to **service**. |
| **`rbac.service.js`** | Permission resolution, **caching**, **wildcard** matching, CRUD orchestration, **assign role** with **single Super Admin** rule. |
| **`rbac.repository.js`** | MySQL-oriented SQL (`mysql2`) + fallbacks; introspects columns (`key` vs `name`, `is_active`, etc.) via `information_schema.COLUMNS`. |
| **`rbac.middleware.js`** | **`authorize(permissionKey)`** — loads user permissions and allows or **403**. |
| **`rbac.events.js`** | Emits **`rbac.role_assigned`**, **`rbac.role_permissions_updated`**, **`rbac.permission_created`**, **`rbac.permission_updated`**. |
| **`rbac.validation.js`** | Zod: permission key format, UUIDs, **`replace`** vs patch rules for role permissions. |
| **`rbac.schema.js`** | Table names: `users`, `roles`, `permissions`, `role_permissions`. |

**Important:** **`createRole`** / **`updateRole`** call **`dependencies.services.roles`** (external **roles** service), not only the repository. If **`rolesService`** is missing, those methods return **500**.

---

## Step-by-step flow

1. **`requireAuth`** (JWT/session user on `req.context.user`).
2. **`authorize("rbac:manage")`** (middleware) — loads **`getPermissionsForUser`**, checks string/wildcard match; sets **`req.context.permissions`**.
3. **`requireSuperAdmin`** (routes) — allows only if **`isSuperAdminRole(req.context.user.role)`**; else **403** `RBAC_SUPERADMIN_REQUIRED`.
4. **`validateRequest`** (Zod).
5. **Controller → service → repository** (or **`rolesService`** for role name/metadata CRUD).

**Exception:** **`GET /api/rbac/me/permissions`** uses **`requireAuth`** only (no **`rbac:manage`**, no super-admin). Any signed-in user reads their own permission list.

---

## HTTP map (quick reference)

### `/api/rbac` (`adminRouter`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/assign` | Assign **`userId`** + **`roleId`** |
| GET | `/permissions` | List permissions |
| POST | `/permissions` | Create permission |
| PATCH | `/permissions/:id` | Update permission |
| GET | `/roles` | List roles |
| POST | `/roles` | Create role (via **rolesService**) |
| PATCH | `/roles/:id` | Update role (via **rolesService**) |
| PATCH | `/roles/:id/permissions` | Patch or replace role permissions |
| GET | `/roles/:id/permissions` | Permissions for role **id** |
| GET | `/roles/:role/permissions` | Permissions by **role name** |
| PUT | `/roles/:role/permissions` | **Replace** all permissions for role **name** (keys; may **createMissing**) |
| GET | `/me/permissions` | **Current user** — no super-admin gate |

### `/api/permissions`

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| PATCH | `/:id` |

### `/api/roles`

| Method | Path |
|--------|------|
| GET | `/` |
| POST | `/` |
| PATCH | `/:id` |
| PATCH | `/:id/permissions` |
| GET | `/:id/permissions` |

All **`/api/permissions`** and **`/api/roles`** routes use **`rbac:manage`** + **super admin** (same as overlapping **`/api/rbac`** endpoints).

---

## Function-wise explanation

### Controller

| Method | Calls service | HTTP |
|--------|----------------|------|
| `assignRole` | `assignRole(body)` | 200 |
| `listPermissions` | `listPermissions(query)` | 200 |
| `createPermission` | `createPermission(body)` | 201 |
| `updatePermission` | `updatePermission(id, body)` | 200 |
| `listRoles` | `listRoles(query)` | 200 |
| `createRole` | `createRole(body)` | 201 |
| `updateRole` | `updateRole(id, body)` | 200 |
| `updateRolePermissions` | `updateRolePermissionsById({ roleId, permissions, permissionIds, replace })` | 200 |
| `getRolePermissionsById` | `getRolePermissionsById(id)` | 200 |
| `getRolePermissions` | `getRolePermissions(roleName)` | 200 |
| `setRolePermissions` | `setRolePermissions({ role, permissions })` | 200 |
| `myPermissions` | `getPermissionsForUser(req.context.user)` | 200 |

### Service (exported surface)

| Function | Purpose |
|----------|---------|
| `clearCache` | Clears permission + user-role caches (e.g. after bulk ops elsewhere). |
| `assignRole` | Validates user/role; **blocks** assigning **Super Admin** if another active user already has it; **`UPDATE users`**; invalidates user cache; **`emitRoleAssigned`**. |
| `listRoles` / `listPermissions` | Lists from DB; maps to API shape. |
| `createRole` / `updateRole` | Delegates to **`rolesService`**. |
| `createPermission` | Insert/upsert permission; invalidates **all** permission caches; **`emitPermissionCreated`**. |
| `updatePermission` | Update by id; invalidates caches; **`emitPermissionUpdated`**. |
| `getPermissionsForUser` | Resolve role (cache + DB); return **`roleId`**, **`role`**, **`permissions`** array. |
| `getPermissionsForUserIds` | Batch map user → role → permissions (for lists). |
| `hasPermission` | **`permissionMatches`** against resolved list (used internally / other modules). |
| `getRolePermissions` | Keys for role **name**. |
| `getRolePermissionsById` | Keys for role **id**. |
| `setRolePermissions` | **`PUT`** style: **`ensureRole`** + **`replaceRolePermissionsByRoleId`**; **`createMissing`** keys; events. |
| `updateRolePermissionsById` | **`replace: true`** → replace link set by **ids** or resolve keys; else **patch** toggles per **`permissionId`** / **`key`**. |

### Middleware

| Function | Purpose |
|----------|---------|
| `authorize(permissionKey)` | Requires login; loads permissions; supports **`*`**, exact key, and **`scope:*`** wildcards; enriches **`req.context.user`** with **roleId** / **role** and sets **`req.context.permissions`**. |

### Repository (high level)

| Area | Behavior |
|------|----------|
| **Capabilities** | One-time introspection: which columns exist on **`roles`**, **`permissions`**, **`role_permissions`**. |
| **Roles** | `listRoles`, `findRoleById` / `findRoleByName`, **`ensureRole`** (insert on conflict). |
| **Permissions** | `listPermissions`, `findPermissionById` / `findPermissionByKey`, **`createPermission`** (upsert on conflict on key column), **`updatePermission`**. |
| **Links** | **`getPermissionsByRoleId`**, batch variants, **`setRolePermissionsByRoleId`** (patch rows), **`replaceRolePermissionsByRoleId`** (full replace), **`setRolePermissions`** (by name + keys). |
| **Users** | **`getRoleForUser`**, **`getRolesForUsers`**, **`assignRoleById`** (updates **`users.role_id`**), **`countActiveUsersByRoleId`**. |

**Note:** Some **mutating** repository helpers **throw** if adapter is not **MySQL** (role-permission writes). See `docs/modules/rbac.md`.

### Events

| Event | When |
|-------|------|
| `rbac.role_assigned` | After successful assign |
| `rbac.role_permissions_updated` | After set/replace/patch of role permissions |
| `rbac.permission_created` | After create permission |
| `rbac.permission_updated` | After update permission |

No email sending in this module; subscribers may trigger notifications.

---

## Input → processing → output (patterns)

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **Assign role** | `userId`, `roleId` | Load role; super-admin uniqueness; update user | `{ userId, roleId, role, assignedAt }` |
| **List permissions/roles** | `includeInactive?` | SQL filters | Array of records |
| **Create permission** | `key`, `description?`, `isActive?` | Upsert by key | Permission object |
| **Update permission** | Partial fields | UPDATE | Permission object |
| **Me permissions** | Session user | Resolve role + keys | `{ roleId, role, permissions }` |
| **Patch role permissions** | `permissions[]` or `replace` + ids/keys | Link table upsert/delete | `{ roleId, role, permissions }` |
| **Put role permissions (by name)** | `permissions: string[]` | Ensure role; resolve/create keys; replace | `{ roleId, role, permissions }` |

---

## Business logic (simple terms)

- Each **user** has one **role** stored on **`users.role_id`**.
- **Permissions** are named capabilities (e.g. `quotations:read`). The **middleware** grants access if the user’s role includes that string, **`*`**, or a **scope** wildcard like `leads:*`.
- **Super Admin** role assignment is **restricted**: only **one active** user may hold that role at a time (enforced in **`assignRole`**).
- **Managing** the catalog (roles/permissions matrices) is restricted to users with **`rbac:manage`** who are also **super admin** (route guard), except **`/me/permissions`** which only needs login.
- **Caching** avoids hammering DB on every request; TTL default **60s** (`permissionCacheTtlMs`). Permission or role changes invalidate relevant caches.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | `users`, `roles`, `permissions`, `role_permissions` (joins) |
| **INSERT/UPSERT** | `permissions` (create), `roles` (**ensureRole**), `role_permissions` |
| **UPDATE** | `users` (**role_id** on assign), `permissions`, `roles` (via **rolesService** / adapter) |
| **DELETE** | `role_permissions` rows when disabling links (non–`is_active` schema path) |

---

## Validations and conditions

- **Permission key** (Zod): `*` or pattern like `resource:action` with optional wildcard in action (`^[a-z0-9_]+:[a-z0-9_*]+$`).
- **UUIDs** for user, role, permission ids where specified.
- **`updateRolePermissions`:** if **`replace: true`**, must send **`permissionIds`** and/or **`permissions`** (empty arrays allowed); if **`replace: false`**, non-empty **`permissions`** array required.
- **Service:** **`assignRole`** → **409** if second Super Admin; **404** missing user/role.

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | **`rbac.*`** events for auditing or downstream notifications (no mail in-module). |
| **Cache** | In-process Maps; invalidation on assign, permission CRUD, role permission updates. |

---

## Example API request/response

**Current user permissions** — `GET /api/rbac/me/permissions`  
Headers: `Authorization: Bearer <token>`

```json
{
  "data": {
    "roleId": "…",
    "role": "Sales",
    "permissions": ["leads:read", "leads:create", "dashboard:read"]
  }
}
```

**Assign role** — `POST /api/rbac/assign` (requires **super admin** + **`rbac:manage`**)

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "roleId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Replace role permissions by id** — `PATCH /api/roles/:id/permissions`

```json
{
  "replace": true,
  "permissionIds": [
    "770e8400-e29b-41d4-a716-446655440002",
    "880e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Patch mode** — `replace: false` (or omit), with toggles:

```json
{
  "permissions": [
    { "key": "leads:read", "enabled": true },
    { "permissionId": "…", "enabled": false }
  ]
}
```

---

## Notes for developers

- **`authorize`** loads permissions once per request; heavy routes should reuse **`req.context.permissions`**.
- **`requireSuperAdmin`** and **`authorize("rbac:manage")`** stack — design **bootstrap** users carefully so someone can grant **`rbac:manage`**.
- **Role CRUD** goes through **`rolesService`** — keep that service aligned with **`roles`** table schema.
- **MySQL** expected for full **role_permissions** mutation paths (`ON DUPLICATE KEY` / `INSERT IGNORE`); in-memory adapter errors on those writes.
- Tune **`dependencies.config.rbac.permissionCacheTtlMs`** if permission changes must propagate faster than default TTL.
