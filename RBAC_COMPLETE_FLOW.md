# Enterprise RBAC — Complete Flow

---

## 1. Database Schema (What Tables Power This)

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    roles    │──────▶│ role_permissions │◀──────│ permissions │
│─────────────│       │──────────────────│       │─────────────│
│ id          │       │ role_id (FK)     │       │ id          │
│ name        │       │ permission_id(FK)│       │ key         │
│ lead_scope  │       │ is_active        │       │ description │
│ is_active   │       └──────────────────┘       │ is_active   │
└─────────────┘                                  └─────────────┘
       ▲
       │ role_id (FK)
┌─────────────┐       ┌──────────────────────┐
│    users    │──────▶│  role_field_policies │
│─────────────│       │──────────────────────│
│ id          │       │ role_id (FK)         │
│ role_id     │       │ entity  (e.g. 'lead')│
│ manager_id  │       │ field   (e.g.'budget')│
│ email       │       │ access  VISIBLE/HIDDEN│
│ is_active   │       └──────────────────────┘
└─────────────┘
       │ assigned_to (FK)
       ▼
┌─────────────┐       ┌─────────────┐
│    leads    │       │ audit_logs  │
│─────────────│       │─────────────│
│ id          │       │ id          │
│ assigned_to │       │ user_id     │
│ lead_country│       │ action      │
│ status      │       │ entity      │
└─────────────┘       │ entity_id   │
                      │ meta (JSONB)│
                      └─────────────┘
```

### Key Fields Per Table

**roles**
| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key, stored in JWT as `roleId` |
| `name` | VARCHAR | e.g. `sales_consultant` — never hardcoded in logic |
| `lead_scope` | VARCHAR(10) | `ALL` / `TEAM` / `OWN` — controls data visibility |
| `is_active` | BOOLEAN | Disable a role without deleting it |

**permissions**
| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `key` | VARCHAR | e.g. `leads:read`, `leads:*`, `*` |
| `is_active` | BOOLEAN | Toggle permission globally |

**role_permissions**
| Field | Type | Purpose |
|---|---|---|
| `role_id` | UUID FK | Links to roles |
| `permission_id` | UUID FK | Links to permissions |
| `is_active` | BOOLEAN | Toggle grant without deleting row |

**users**
| Field | Type | Purpose |
|---|---|---|
| `role_id` | UUID FK | The user's role |
| `manager_id` | UUID FK | Self-referencing — who manages this user |

**role_field_policies**
| Field | Type | Purpose |
|---|---|---|
| `role_id` | UUID FK | Which role this policy applies to |
| `entity` | VARCHAR | e.g. `lead` |
| `field` | VARCHAR | e.g. `budget`, `revenue` |
| `access` | VARCHAR | `VISIBLE` / `HIDDEN` / `MASKED` |

---

## 2. JWT Token — What's Inside

When a user logs in, `auth.service.js → buildAuthResponse()` signs:

```json
{
  "sub":    "user-uuid",
  "email":  "agent@company.com",
  "role":   "sales_consultant",
  "roleId": "role-uuid",
  "iat":    1700000000,
  "exp":    1700086400
}
```

| Field | Used For |
|---|---|
| `sub` | `context.user.id` — identifies the user in every service call |
| `role` | Fallback heuristic only (if DB lookup fails) |
| `roleId` | **Primary** — used to fetch `lead_scope` + permissions from DB |

---

## 3. Permission Key Format

```
resource:action

leads:read      → can view leads
leads:create    → can create leads
leads:update    → can update leads
leads:delete    → can delete leads
leads:*         → all lead actions
*               → everything (super_admin / admin only)
```

### Wildcard Resolution Rules

```
*           matches everything
leads:*     matches leads:read, leads:create, leads:update, leads:delete
leads:write matches leads:read, leads:create, leads:update, leads:delete
```

---

## 4. Role → Permissions → Scope Matrix

| Role | Permissions | lead_scope |
|---|---|---|
| `super_admin` | `*` | ALL |
| `admin` | `*` | ALL |
| `manager` | `leads:*`, `quotations:*`, `bookings:*`... | TEAM |
| `sales_consultant` | `leads:*`, `quotations:*`... | OWN |
| `visa_executive` | `leads:read`, `visa:*`... | OWN |
| `accounts` | `payments:*`, `refunds:*`, `leads:read`... | ALL |
| `marketing` | `leads:read`, `campaigns:*`... | ALL |
| `management` | `leads:read`, `reports:read`... | ALL |

---

## 5. Complete Request Flow — Step by Step

```
CLIENT
  │
  │  GET /api/leads
  │  Authorization: Bearer eyJhbGci...
  │
  ▼
─────────────────────────────────────────────────────
LAYER 1: requestContext middleware
  Creates req.context = { requestId, user: null }
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 2: requireAuth middleware  (auth.middleware.js)
  1. Extracts Bearer token from Authorization header
  2. Calls authService.verifyToken(token)
     → jwt.verify(token, JWT_SECRET)
     → returns { sub, email, role, roleId }
  3. Sets req.context.user = { id, email, role, roleId }
  4. Calls next()
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 3: requirePermission('leads:read') middleware
  1. Reads req.context.user.roleId
  2. Checks in-memory cache:
       key = "role:{roleId}:permissions"
       HIT  → use cached Set<string>
       MISS → query DB:
         SELECT p.key
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $roleId
           AND rp.is_active = TRUE
           AND p.is_active = TRUE
       → store in cache (TTL 5 min)
  3. Checks if 'leads:read' is granted:
       '*'        → YES (super_admin/admin)
       'leads:*'  → YES (wildcard match)
       'leads:read' → YES (exact match)
       none match → 403 Forbidden
  4. Calls next()
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 4: leads.controller.js
  Calls service.list(req.query, req.context)
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 5: leads.service.js → resolveLeadScope(context)
  1. Reads context.user.roleId
  2. Checks cache:
       key = "role:{roleId}:scope"
       HIT  → use cached scope
       MISS → query DB:
         SELECT lead_scope FROM roles WHERE id = $roleId
       → store in cache (TTL 5 min)
  3. Returns "ALL" | "TEAM" | "OWN"
─────────────────────────────────────────────────────
  │
  ├── scope = "ALL"
  │     No filter applied → sees all leads
  │
  ├── scope = "OWN"
  │     mappedFilters.assignedTo = context.user.id
  │     mappedFilters.allowedCountries = user's countries
  │
  └── scope = "TEAM"
        1. getAllSubordinates(userId):
             WITH RECURSIVE subordinates AS (
               SELECT id FROM users WHERE id = $userId
               UNION ALL
               SELECT u.id FROM users u
               JOIN subordinates s ON u.manager_id = s.id
             )
             SELECT id FROM subordinates WHERE id != $userId
        2. mappedFilters.visibleAssigneeIds = [userId, ...subordinateIds]
        3. mappedFilters.includeUnassigned = true
        4. mappedFilters.allowedCountries = manager's countries
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 6: leads.repository.js → findAll(mappedFilters)
  Builds SQL WHERE clause from filters:
    - assigned_to = $userId              (OWN)
    - assigned_to = ANY($ids::uuid[])    (TEAM)
    - lead_country = ANY($countries)     (country scope)
  Executes paginated query
  Returns { items, total, page, limit }
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 7: Field-Level Security (service layer)
  1. Reads role_field_policies for this roleId:
       SELECT field, access
       FROM role_field_policies
       WHERE role_id = $roleId AND entity = 'lead'
  2. Strips / masks fields from each lead:
       HIDDEN → delete lead.budget
       MASKED → lead.budget = '***'
─────────────────────────────────────────────────────
  │
  ▼
─────────────────────────────────────────────────────
LAYER 8: Audit Log (async, non-blocking)
  INSERT INTO audit_logs
    (user_id, action, entity, entity_id, meta, ip_address)
  VALUES
    ($userId, 'lead.read', 'lead', null, {filters}, $ip)
─────────────────────────────────────────────────────
  │
  ▼
CLIENT receives scoped, field-filtered lead list
```

---

## 6. Caching Strategy

```
In-Memory Cache (Map with TTL)
  key: "role:{roleId}:permissions"  → Set<string> of permission keys
  key: "role:{roleId}:scope"        → "ALL" | "TEAM" | "OWN"
  key: "role:{roleId}:fields:{entity}" → Map<field, access>
  TTL: 5 minutes

Cache is invalidated when:
  - A role's permissions are updated
  - A role's lead_scope is changed
  - A field policy is changed

For multi-instance deployments → replace Map with Redis:
  await redis.setex(key, 300, JSON.stringify(value))
  const cached = await redis.get(key)
```

---

## 7. Permission Check Logic (Exact Code)

```js
function hasPermission(grantedKeys, required) {
  const req = required.toLowerCase()
  for (const key of grantedKeys) {
    if (key === '*')           return true  // super admin
    if (key === req)           return true  // exact match
    if (key.endsWith(':*')) {
      const scope = key.slice(0, -2)
      if (req.startsWith(scope + ':')) return true  // leads:* covers leads:read
    }
    if (key.endsWith(':write')) {
      const scope = key.slice(0, -6)
      if (req === `${scope}:read`   ||
          req === `${scope}:create` ||
          req === `${scope}:update` ||
          req === `${scope}:delete`) return true
    }
  }
  return false
}
```

---

## 8. Scope → SQL Filter Translation

```
scope = "ALL"
  → No WHERE clause added
  → Returns all leads

scope = "OWN"
  → WHERE l.assigned_to = $userId
  → AND LOWER(l.lead_country) = ANY($userCountries)

scope = "TEAM"
  → WHERE (l.assigned_to IS NULL
           OR l.assigned_to = ANY($teamMemberIds::uuid[]))
  → AND LOWER(l.lead_country) = ANY($managerCountries)

  $teamMemberIds = recursive query result:
    WITH RECURSIVE sub AS (
      SELECT id FROM users WHERE id = $managerId
      UNION ALL
      SELECT u.id FROM users u JOIN sub s ON u.manager_id = s.id
    )
    SELECT id FROM sub WHERE id != $managerId
```

---

## 9. Field-Level Security

```
role_field_policies table controls what fields are visible per role.

Example rows:
  sales_consultant | lead | budget  | HIDDEN
  sales_consultant | lead | revenue | HIDDEN
  accounts         | lead | budget  | VISIBLE
  admin            | lead | budget  | VISIBLE

After fetching leads, service strips fields:
  for each lead:
    for each policy where access = HIDDEN:
      delete lead[field]
    for each policy where access = MASKED:
      lead[field] = '***'

Result:
  sales_consultant sees:  { name, email, phone, destination, status }
  accounts sees:          { name, email, phone, destination, status, budget, revenue }
```

---

## 10. Audit Logging

Every lead action is logged asynchronously:

```
Action          Logged When
─────────────────────────────────────────
lead.read       GET /api/leads (list)
lead.view       GET /api/leads/:id
lead.create     POST /api/leads
lead.update     PATCH /api/leads/:id
lead.delete     DELETE /api/leads/:id
lead.assign     POST /api/leads/:id/assign
```

```sql
-- audit_logs table
id          UUID  PRIMARY KEY
user_id     UUID  FK → users
action      VARCHAR  e.g. 'lead.update'
entity      VARCHAR  e.g. 'lead'
entity_id   UUID     the lead's id
meta        JSONB    { before, after, ip, userAgent }
ip_address  VARCHAR
created_at  TIMESTAMP
```

---

## 11. Two-Axis Authorization Model

Every request is checked on TWO axes independently:

```
AXIS 1: PERMISSION (Can this role perform this ACTION?)
  leads:read   → can list/view leads
  leads:create → can create leads
  leads:update → can update leads
  leads:assign → can assign leads to agents

AXIS 2: SCOPE (Which DATA can this user see?)
  ALL  → every lead in the system
  TEAM → only leads belonging to user's hierarchy
  OWN  → only leads assigned to this user

Both must pass. Example:
  marketing role:
    ✅ has leads:read permission  → can perform the read action
    ✅ scope = ALL               → sees all leads
    ❌ no leads:update           → cannot update any lead

  sales_consultant role:
    ✅ has leads:read permission  → can perform the read action
    ✅ scope = OWN               → but only sees their own leads
    ✅ has leads:update          → can update leads they can see
```

---

## 12. Adding a New Role (Zero Code Changes)

```sql
-- 1. Insert the role
INSERT INTO roles (name, description, lead_scope)
VALUES ('senior_consultant', 'Senior Sales Consultant', 'TEAM');

-- 2. Grant permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'senior_consultant'
  AND p.key IN ('leads:read', 'leads:update', 'leads:create', 'quotations:*');

-- 3. Set field policies (optional)
INSERT INTO role_field_policies (role_id, entity, field, access)
SELECT r.id, 'lead', 'budget', 'VISIBLE'
FROM roles r WHERE r.name = 'senior_consultant';
```

No deployment. No code change. Cache invalidates in 5 minutes (or immediately if you call the invalidate endpoint).

---

## 13. File Map

```
backend/src/
├── core/
│   ├── middlewares/
│   │   ├── requestContext.js     → creates req.context
│   │   └── validate.js
│   └── rbac/
│       ├── rbacCache.js          → in-memory TTL cache
│       ├── permissionChecker.js  → hasPermission() logic
│       └── requirePermission.js  → Express middleware factory
│
├── modules/
│   ├── auth/
│   │   ├── auth.middleware.js    → requireAuth (verifies JWT, sets context.user)
│   │   └── auth.service.js      → buildAuthResponse (signs JWT with roleId)
│   │
│   └── leads/
│       ├── leads.controller.js  → calls service, triggers audit log
│       ├── leads.service.js     → resolveLeadScope(), applyFieldPolicies()
│       └── leads.repository.js  → findAll() builds scoped SQL
│                                   findRoleLeadScope() reads roles table
│                                   getAllSubordinates() recursive CTE
│
└── database/migrations/
    ├── 027_roles_lead_scope.sql         → adds lead_scope to roles
    └── 028_enterprise_rbac_upgrade.sql  → audit_logs, field_policies, indexes
```
