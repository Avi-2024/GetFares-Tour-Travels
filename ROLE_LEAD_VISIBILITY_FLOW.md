# Role-Based Lead Visibility — Full Flow

## The Problem We Solved

Before this change, lead visibility was controlled by **hardcoded role name strings** inside `leads.service.js`:

```js
// OLD — fragile, breaks every time a new role is added
function isAgentRole(value) {
  return role === 'agent' || role === 'sales_consultant' || role === 'holiday_consultant'
}
function isFullAccessRole(value) {
  return role === 'admin' || role === 'accounts' // marketing/management were MISSING → saw ALL leads
}
```

Every new role required a developer to find and edit business logic. `marketing` and `management` roles were not handled at all, so they fell through and saw **every lead in the system**.

---

## The Fix — Data-Driven Scope

Lead visibility is now a **property of the role record in the database**, not code.

---

## Database Fields Involved

### Table: `roles`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(50) | Role identifier e.g. `sales_consultant` |
| `lead_scope` | VARCHAR(10) | **NEW** — controls what leads this role can see |

### `lead_scope` values

| Value | Who sees what |
|---|---|
| `ALL` | Every lead in the system |
| `TEAM` | Own leads + all leads assigned to managed agents + unassigned leads (within allowed countries) |
| `OWN` | Only leads assigned directly to this user |

### Roles and their scopes

| Role | `lead_scope` | Reason |
|---|---|---|
| `super_admin` | `ALL` | Full system access |
| `admin` | `ALL` | Full system access |
| `accounts` | `ALL` | Needs all leads for finance mapping |
| `marketing` | `ALL` | Needs all leads for campaign reporting |
| `management` | `ALL` | Read-only oversight of all leads |
| `manager` | `TEAM` | Sees own team's leads + unassigned |
| `department_head` | `TEAM` | Same as manager |
| `team_lead` | `TEAM` | Same as manager |
| `sales_consultant` | `OWN` | Only their assigned leads |
| `holiday_consultant` | `OWN` | Only their assigned leads |
| `agent` | `OWN` | Only their assigned leads |
| `visa_executive` | `OWN` | Only their assigned leads |

### Migration file
`backend/database/migrations/027_roles_lead_scope.sql`

```sql
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS lead_scope VARCHAR(10) NOT NULL DEFAULT 'ALL'
  CHECK (lead_scope IN ('ALL', 'TEAM', 'OWN'));

UPDATE roles SET lead_scope = 'ALL'  WHERE name IN ('super_admin', 'admin', 'accounts', 'marketing', 'management');
UPDATE roles SET lead_scope = 'TEAM' WHERE name IN ('manager', 'department_head', 'team_lead');
UPDATE roles SET lead_scope = 'OWN'  WHERE name IN ('agent', 'sales_consultant', 'holiday_consultant', 'visa_executive');
```

---

## JWT Token Fields Used

When a user logs in, the backend signs a JWT with these fields:

```json
{
  "sub":    "user-uuid",
  "email":  "user@example.com",
  "role":   "sales_consultant",
  "roleId": "role-uuid"
}
```

| JWT Field | Used for |
|---|---|
| `sub` | Identifies the user (`context.user.id`) |
| `role` | Fallback heuristic if `lead_scope` column doesn't exist yet |
| `roleId` | **Primary** — used to look up `lead_scope` from the `roles` table |

---

## Full Request Flow

```
User logs in
    │
    ▼
JWT issued  { sub, email, role, roleId }
    │
    ▼
GET /api/leads  →  Authorization: Bearer <token>
    │
    ▼
auth.middleware.js
  verifyToken(token)
  req.context.user = { id: sub, email, role, roleId }
    │
    ▼
leads.controller.js
  service.list(query, req.context)
    │
    ▼
leads.service.js  →  resolveLeadScope(context)
    │
    ├── reads context.user.roleId
    │
    ▼
leads.repository.js  →  findRoleLeadScope(roleId)
    │
    SELECT lead_scope FROM roles WHERE id = $roleId
    │
    returns  "ALL" | "TEAM" | "OWN"
    │
    ▼
leads.service.js  applies filter based on scope:

  scope = "ALL"  →  no filter, return everything
  
  scope = "OWN"  →  mappedFilters.assignedTo = userId
                     mappedFilters.allowedCountries = user's countries
  
  scope = "TEAM" →  mappedFilters.visibleAssigneeIds = [userId, ...managedAgentIds]
                     mappedFilters.includeUnassigned = true
                     mappedFilters.allowedCountries = manager's countries
    │
    ▼
leads.repository.js  →  findAll(mappedFilters)
  builds SQL WHERE clause from filters
    │
    ▼
Returns scoped lead list to frontend
```

---

## Code Locations

| What | File |
|---|---|
| JWT signing | `backend/src/modules/auth/auth.service.js` → `buildAuthResponse()` |
| JWT verification + context | `backend/src/modules/auth/auth.middleware.js` → `requireAuth()` |
| Scope resolution | `backend/src/modules/leads/leads.service.js` → `resolveLeadScope()` |
| DB lookup for scope | `backend/src/modules/leads/leads.repository.js` → `findRoleLeadScope()` |
| SQL filter building | `backend/src/modules/leads/leads.repository.js` → `findAll()` |
| Migration | `backend/database/migrations/027_roles_lead_scope.sql` |

---

## Fallback Behaviour

If the `lead_scope` column doesn't exist yet (migration not run), `resolveLeadScope` falls back to role-name heuristics so nothing breaks:

```js
async function resolveLeadScope(context) {
  const roleId = context.user?.roleId
  if (roleId) {
    const scope = await repository.findRoleLeadScope(roleId)
    if (scope === 'ALL' || scope === 'TEAM' || scope === 'OWN') return scope
  }
  // Fallback — role name matching
  const role = normalizeRoleToken(context.user?.role)
  if (role === 'agent' || role === 'sales_consultant' || role === 'holiday_consultant') return 'OWN'
  if (role === 'manager' || role === 'department_head' || role === 'team_lead') return 'TEAM'
  return 'ALL'
}
```

---

## How to Add a New Role in Future

**No code changes needed.** Just insert the role with the correct scope:

```sql
INSERT INTO roles (name, description, lead_scope)
VALUES ('senior_consultant', 'Senior Sales Consultant', 'OWN');
```

That's it. The system picks it up automatically on the next request.

---

## How to Run the Migration

```bash
cd backend

# Option 1 — via migrate script (if no earlier migrations are failing)
node scripts/migrate.js

# Option 2 — directly via psql
psql $DATABASE_URL -f database/migrations/027_roles_lead_scope.sql

# Option 3 — via node
node --input-type=module << "EOF"
import dotenv from 'dotenv';
import { Client } from 'pg';
import { readFileSync } from 'fs';
dotenv.config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(readFileSync('./database/migrations/027_roles_lead_scope.sql', 'utf8'));
console.log('Migration applied');
await client.end();
EOF
```

---

## Verify It Worked

```sql
SELECT name, lead_scope FROM roles ORDER BY name;
```

Expected output:

```
 name                | lead_scope
---------------------+-----------
 accounts            | ALL
 admin               | ALL
 agent               | OWN
 department_head     | TEAM
 holiday_consultant  | OWN
 management          | ALL
 manager             | TEAM
 marketing           | ALL
 sales_consultant    | OWN
 super_admin         | ALL
 team_lead           | TEAM
 visa_executive      | OWN
```
