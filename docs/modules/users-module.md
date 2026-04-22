# Users module — developer guide

**Location:** `backend/crm/modules/users`  
**Base URL:** `/api/users`

CRUD for **CRM user accounts** (`users` table): profile, **role**, **manager/parent** link, **sales targets**, **agent type**, and optional **multi-country** assignment via **`user_countries`**. **Passwords** are stored as **bcrypt** hashes. Integrates with **RBAC** to attach **permission lists** on read/list.

**Dependencies:** **`rbacService`** (from **`dependencies.services.rbac`**) for permission resolution; **`rolesService`** is passed in **`index.js`** but **not** used by **`users.service.js`** (roles come from **`repository.findRoles`**).

---

## High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | List, **list roles**, get by id, create, update. **`GET /roles`** registered **before** **`/:id`**. |
| **Controller** | Passes validated input + **`req.context`** to **service**. |
| **Service** | Validation: hierarchy, **single Super Admin**, country rules, **actor** role (manager/agent) scoping; maps API ↔ DB; hashes password; **`replaceUserCountries`**. |
| **Repository** | **`users`** CRUD; **`roles`**, **`countries`**, **`user_countries`**; **`hasColumn`** for **`parent_id`**; Postgres-specific queries where needed. |
| **Events** | **`users.created`**, **`users.updated`** (raw row payload from create/update). |

**Tables (`users.schema.js`):** **`users`**, **`roles`**, **`countries`**, **`user_countries`**. (**`attendance`**, **`leaves`** in schema for other features — not used in this module’s repository.)

**Permissions:** **`users:read`**, **`users:create`**, **`users:update`**.

---

## Step-by-step flow

1. **`requireAuth`** + **`authorize(...)`**.  
2. **`validateRequest`** (Zod).  
3. **Controller** → **service** → **repository** / **rbacService**.  
4. On create/update: **events**; create/update may also **rewrite** **`user_countries`**.

---

## HTTP map

| Method | Path | Permission |
|--------|------|------------|
| GET | `/` | `users:read` |
| GET | `/roles` | `users:read` |
| GET | `/:id` | `users:read` |
| POST | `/` | `users:create` |
| PATCH | `/:id` | `users:update` |

---

## Function-wise explanation

### Controller

| Handler | Service call | Status |
|---------|----------------|--------|
| `list` | `list(query, context)` | 200 |
| `listRoles` | `listRoles(context)` | 200 |
| `getById` | `getById(id, context)` | 200 |
| `create` | `create(body, context)` | 201 |
| `update` | `update(id, body, context)` | 200 |

### Service

| Function | Purpose |
|----------|---------|
| **`list`** | **`repository.findAll`** with mapped filters; loads **role** names; batch **permissions** via **`rbacService.getPermissionsForUserIds`**; batch **countries** via **`listUserCountriesByUserIds`**; maps each row with **`toUser`**. |
| **`listRoles`** | **`repository.findRoles()`** — id, name, description, country; used for dropdowns. |
| **`getById`** | Single user; **404** if missing; **permissions** via **`rbacService.getPermissionsForUser`**; **countries** from join table. |
| **`create`** | Requires **password** or **passwordHash**; **roleId**; hashes **`password`** with **bcrypt (cost 12)** if needed. Validates **hierarchy** (Super Admin / Manager **no parent**; agents **may** omit parent per current rules). **Actor rules:** **Agents** cannot create; **Managers** may create **only AGENT** users with **parentId = self**. **Super Admin** uniqueness if activating super-admin role. Resolves **countries** (**`countryIds`** or legacy **`agentCountry`/`country`**); **Manager/Agent** must have country when not using valid **`countryIds`**. **`replaceUserCountries`** when **`countryIds`** sent. Returns **`getById`** of new user. **`emitCreated`**. Maps PG unique violation **23505** → **409** duplicate email. |
| **`update`** | Loads existing via **`getById`**; same hierarchy, actor, super-admin, country logic; can clear **parent** when role is not agent; **`replaceUserCountries`** when **`countryIds`** present; **`emitUpdated`**. |

**Helpers (internal):** **`mapListFilters`**, **`mapCreatePayload`** / **`mapUpdatePayload`**, **`getRoleKind`**, **`validateHierarchy`**, **`resolveAndValidateCountries`**, **`ensureSingleSuperAdmin`**, **`supportsParentIdColumn`** (drops **`parent_id`** from payload if column missing).

### Repository

| Method | DB |
|--------|-----|
| `findAll` / `findById` / `create` / `update` | **`users`** |
| `findRoles` | All **`roles`** |
| `countActiveUsersByRoleId` | Count active users per role (Super Admin rule) |
| `findCountriesByIds` | **`countries`** by UUID list |
| `listUserCountriesByUserIds` | **`user_countries`** ⋈ **`countries`** |
| `replaceUserCountries` | **DELETE** then **INSERT** … **ON CONFLICT** update **is_primary** (Postgres) |
| `hasColumn` | **`information_schema`** (Postgres only) |

---

## Input → processing → output

| Action | Input | Processing | Output |
|--------|--------|------------|--------|
| **List** | Query: **page**, **limit**, **roleId**, **email**, **isActive**, **isOnLeave**, **active**, **managerId** | Filter + enrich | Users + **permissions** + **countries** |
| **Create** | Name, email, **password** or **passwordHash**, **roleId**, optional hierarchy & countries | Hash, validate, insert, optional **user_countries** | Full user DTO (**getById**) |
| **Update** | Partial fields (≥1) | Merge rules, update row, optional countries | Full user DTO |

---

## Business logic (simple terms)

- Every user has a **role** (from **`roles`**). Role name drives **kind**: **Super Admin**, **Manager**, **Agent**, or **Other**.  
- **Super Admin** cannot have a **manager/parent**. **Manager** cannot have a parent (flat under super admin). **Agents** no longer **require** a manager in code (comment in **`validateHierarchy`**).  
- Only **one active Super Admin** at a time (same idea as RBAC **assign role**).  
- **Managers** creating users may only create **agents**, and the agent’s **parent** must be **the manager**. **Managers** updating users may only touch **their own agents**. **Agents** cannot create or update users.  
- **Countries:** Either **`countryIds`** (+ optional **`primaryCountryId`**) for **`user_countries`**, or legacy **string** **`agentCountry`/`country`**. **Managers** and **Agents** need at least one country (validated when not using valid **`countryIds`** list).  
- **Active** user: both **`isActive`** and **`active`** flags must be truthy where **`resolveUserActiveState`** applies.  
- **`manager_id`** / **`parent_id`** / **`parentId`** are treated as the same hierarchy field; **`parent_id`** is omitted on create/update if the DB has **no** **`parent_id`** column.

---

## Database operations

| Operation | Tables |
|-----------|--------|
| **SELECT** | **`users`**, **`roles`**, **`countries`**, **`user_countries`** |
| **INSERT** | **`users`**; **`user_countries`** (per country row) |
| **UPDATE** | **`users`** |
| **DELETE** | **`user_countries`** rows for user (before re-insert) in **`replaceUserCountries`** |

---

## Validations and conditions

- **Zod:** Create requires **fullName**, **email**; **password** or **passwordHash**; update needs ≥1 field; UUIDs for ids; **`countryIds`** max 20 UUIDs; **target/incentive** ranges.  
- **Service:** **404** missing user/role; **400** country/hierarchy; **403** manager/agent scope; **409** duplicate email (**23505**) or second Super Admin.  
- **RBAC:** If **`rbacService`** missing, **permissions** arrays may be **empty** on list/get (check how **`getPermissionsForUser`** behaves — list uses **`getPermissionsForUserIds`** which needs rbac).

---

## Side effects

| Kind | Details |
|------|---------|
| **Event bus** | **`users.created`**, **`users.updated`** — e.g. notifications or audit subscribers. |
| **Email** | **None** in-module (no welcome email). |

---

## Example API request/response

**Create** — `POST /api/users`

```json
{
  "fullName": "Priya Sharma",
  "email": "priya@example.com",
  "password": "SecurePass123",
  "roleId": "660e8400-e29b-41d4-a716-446655440001",
  "countryIds": ["770e8400-e29b-41d4-a716-446655440002"],
  "primaryCountryId": "770e8400-e29b-41d4-a716-446655440002",
  "targetAmount": 500000,
  "incentivePercent": 2
}
```

**Update** — `PATCH /api/users/:id`

```json
{
  "isActive": true,
  "isOnLeave": false,
  "targetAmount": 600000
}
```

**List roles** — `GET /api/users/roles` returns role catalog for UI.

---

## Notes for developers

- **`index.js`** injects **`rolesService`** but **service file does not use it** — role list uses **`db.findMany('roles')`**.  
- **`user_countries`** / **`replaceUserCountries`** needs **Postgres**; non-Postgres adapter returns **empty** country maps and **skips** replace.  
- **`parent_id`** support is **runtime-detected**; older DBs may only have **`manager_id`** — check your migrations.  
- **`toUser`** exposes **`country`** / **`agentCountry`** from **primary** **`user_countries`** row when present.  
- Secure **password reset** flows belong in **auth** module — this module only sets password on **create** (and update does not expose password fields in validation — password change likely elsewhere).
