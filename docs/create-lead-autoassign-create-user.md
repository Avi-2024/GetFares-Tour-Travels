# Create Lead, Auto-Assign Lead & Create User — Developer Documentation

## Table of Contents
1. [Create Lead](#1-create-lead)
2. [Auto-Assign Lead](#2-auto-assign-lead)
3. [Create User](#3-create-user)
4. [Error Reference](#4-error-reference)

---

## 1. Create Lead

### Endpoint
```
POST /api/leads
Authorization: Bearer <token>
Permission: leads:create
```

### Public Capture (no auth required)
```
POST /api/leads/public-capture
```
Used for website enquiry forms. No JWT required.

---

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | string (min 2) | ✅ | Lead's full name |
| `phone` | string (6–20) | ✅ | Contact phone number |
| `email` | string (email) | ✅ | Contact email address |
| `leadCountry` | string | optional | Country the lead is enquiring from |
| `leadType` | `HOLIDAY` \| `VISA` \| `BOTH` | optional | Defaults to `HOLIDAY` |
| `destinationId` | UUID | optional | Linked destination |
| `destinationName` | string | optional | Auto-creates destination if not found |
| `travelDate` | date string | optional | Planned travel date |
| `budget` | number | optional | Budget in base currency |
| `adultsCount` | integer | optional | Defaults to 1 |
| `childrenCount` | integer | optional | Defaults to 0 |
| `childAges` | integer[] | optional | Ages of children (0–18) |
| `visaRequired` | boolean | optional | |
| `preferredHotelCategory` | `3_STAR` \| `4_STAR` \| `5_STAR` \| `ANY` | optional | |
| `travelPurpose` | string | optional | |
| `source` | string | optional | Defaults to `"Manual"` |
| `campaignId` | UUID | optional | Linked marketing campaign |
| `utmSource` / `utmMedium` / `utmCampaign` | string | optional | UTM tracking |
| `assignedTo` | UUID | optional | Pre-assign to a specific user |
| `isVip` | boolean | optional | Marks lead as VIP |
| `status` | string | optional | Defaults to `OPEN` |
| `notes` | string (max 2000) | optional | Initial note, creates an activity |
| `autoAssign` | boolean | optional | Set `false` to skip auto-assignment. Defaults to `true` |

---

### What Happens Internally

```
POST /api/leads
       │
       ▼
  Validate (Zod)
       │
       ▼
  Normalize status → OPEN
  Resolve destinationId (by name if needed)
       │
       ▼
  Check for duplicate lead
  (same email or phone → 409 LEAD_DUPLICATE)
       │
       ▼
  Find or create Customer record
  (linked via customer_id if column exists)
       │
       ▼
  Insert lead row
  Determine temperature (HOT / WARM / COLD)
  Set response_deadline = now + 15 minutes
       │
       ▼
  Emit leads.created event
       │
       ▼
  autoAssign !== false AND no assignedTo AND status not closed?
       │
       YES → selectAssigneeForLead() → update assigned_to
       NO  → queueLeadIfNeeded("NO_ACTIVE_AGENT")
```

---

### Temperature Logic

| Condition | Temperature |
|---|---|
| Travel date within 30 days | HOT |
| Budget ≥ ₹1,50,000 AND positive response | HOT |
| Travel date 30–90 days away | WARM |
| Any positive response status | WARM |
| Everything else | COLD |

Positive response statuses: `CONTACTED`, `WIP`, `QUOTED`, `FOLLOW_UP`, `CONVERTED`

---

### Response

```json
{
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "status": "OPEN",
    "temperature": "WARM",
    "assignedTo": "uuid-of-agent",
    "assignedAt": "2026-03-30T14:00:00.000Z",
    "responseDeadline": "2026-03-30T14:15:00.000Z",
    "leadType": "HOLIDAY",
    "source": "Website",
    "createdAt": "2026-03-30T14:00:00.000Z"
  }
}
```

---

### Duplicate Detection

A duplicate is detected when:
- Another lead exists with the **same email** OR **same phone**
- Matched via the `customers` table (if `customer_id` column exists on leads)
- Returns `409 LEAD_DUPLICATE` with `existingLeadId` in details

To get the existing lead instead of an error, use the internal `createOrGetDuplicate` method (used by Meta webhook integration).

---

### Status Normalization Map

| Input | Stored As |
|---|---|
| `NEW`, `OPEN`, `HOT`, `WARM`, `COLD` | `OPEN` |
| `NEGOTIATION`, `WIP` | `WIP` |
| `FOLLOW_UP_1` – `FOLLOW_UP_3`, `FINAL_REMINDER` | `FOLLOW_UP` |
| `CANCELLED` | `LOST` |
| `CONTACTED`, `QUOTED`, `CONVERTED`, `LOST`, `NON_RESPONSIVE` | (same) |

---

---

## 2. Auto-Assign Lead

Auto-assignment runs automatically after lead creation and can also be triggered manually.

### Manual Assign Endpoint
```
POST /api/leads/:id/assign
Authorization: Bearer <token>
Permission: leads:update
```

### Manual Assign Body (all optional)

| Field | Type | Description |
|---|---|---|
| `assignedTo` | UUID | Assign to a specific user (skips auto-selection) |
| `force` | boolean | Re-assign even if already assigned |
| `roleName` | `agent` \| `manager` | Which pool to pick from. Defaults to `agent` |
| `excludeUserId` | UUID | Skip this user during selection |
| `reason` | string | Reason note stored in assignment history |
| `mode` | `MANUAL` \| `AUTO` \| `AUTO_DISTRIBUTION` \| `AUTO_REASSIGN` \| `AUTO_CREATE` | Assignment mode label |

---

### Auto-Assignment Flow

```
assignLead(leadId, options)
       │
       ▼
  Lead already assigned AND force !== true?
  → return existing lead (no-op)
       │
       ▼
  assignedTo provided in payload?
  → validate user exists
  → validate country match
  → validate manager scope (if manager is assigning)
       │
       NO → selectAssigneeForLead(lead, options)
              │
              ▼
         Determine leadCountry and leadType from lead
              │
              ▼
         findActiveAssignableUsers("agent")
         → active users (is_active=true, is_on_leave=false)
         → roles: sales_consultant, agent, visa_executive, holiday_consultant
              │
              ▼
         Filter by leadCountry (agent_country must match)
         Filter by leadType (agent_type must match or be BOTH)
              │
              ▼
         No country match? → fallback: try all countries
              │
              ▼
         managerId set? → filter to manager's team only
              │
              ▼
         destinationId set? → prefer agents with matching expertise_destinations
              │
              ▼
         VIP or budget ≥ ₹1,50,000?
         → sort by lowest open lead load, then highest incentive_percent
              │
              ▼
         Otherwise → Round-Robin selection
         (per country+type key, wraps around)
              │
              ▼
         No candidates found?
         → emit escalated event
         → enqueue lead in queued_leads (reason: NO_ASSIGNABLE_AGENT)
         → return lead unassigned
       │
       ▼
  Update lead: assigned_to, assigned_at
  Reset response_deadline = now + 15 min (if not yet responded)
       │
       ▼
  Create lead_activities record (LEAD_ASSIGNED or LEAD_REASSIGNED)
  Create lead_assignment_history record
       │
       ▼
  Emit leads.assigned or leads.reassigned event
```

---

### Agent Selection Rules (Priority Order)

| Priority | Rule |
|---|---|
| 1 | Must be `is_active = true` and `is_on_leave = false` |
| 2 | Role must be `sales_consultant`, `agent`, `visa_executive`, or `holiday_consultant` |
| 3 | `agent_country` must match `lead_country` (if lead has a country) |
| 4 | `agent_type` must match `lead_type` or be `BOTH` (if lead has a type) |
| 5 | If destination set: prefer agents with matching `expertise_destinations` |
| 6 | VIP / high-budget leads: pick agent with fewest open leads |
| 7 | All others: round-robin within the filtered pool |

---

### Round-Robin Behaviour

- State is kept **in-memory** per `country:agentType` key
- On server restart, round-robin resets to the first agent
- Agents are sorted by `id` (alphabetical) before rotation
- After the last agent, wraps back to the first

---

### Queued Leads

When no agent is available, the lead is inserted into `queued_leads`:

```json
{
  "lead_id": "uuid",
  "reason": "NO_ASSIGNABLE_AGENT",
  "queued_at": "2026-03-30T14:00:00.000Z",
  "processed_at": null
}
```

To retry queued leads:
```
POST /api/leads/distribute
```
Or the scheduler runs `processQueuedLeads` automatically.

---

### Bulk Distribution
```
POST /api/leads/distribute
Authorization: Bearer <token>
Permission: leads:update

Body: { "limit": 25, "reason": "BULK_DISTRIBUTION" }
```
Picks up to `limit` unassigned OPEN leads and runs `assignLead` on each.

---

### Reassign Inactive
```
POST /api/leads/reassign-inactive
Authorization: Bearer <token>
Permission: leads:update

Body: { "inactiveMinutes": 15, "limit": 25 }
```
Finds OPEN leads assigned to agents who have had no activity for `inactiveMinutes` and reassigns them (excluding the previous agent).

---

---

## 3. Create User

### Endpoint
```
POST /api/users
Authorization: Bearer <token>
Permission: users:create
```

---

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | ✅ | User's full name |
| `email` | string (email) | ✅ | Must be unique |
| `password` | string | ✅ | Plain text — hashed with bcrypt (cost 12) |
| `roleId` | UUID | ✅ | Must reference an existing role |
| `parentId` / `managerId` | UUID | conditional | Required for agent roles. Forbidden for manager/superadmin |
| `countryIds` | UUID[] | conditional | Required for manager/agent roles |
| `primaryCountryId` | UUID | optional | Which of `countryIds` is primary. Defaults to first |
| `agentCountry` / `country` | string | optional | Legacy single-country field (used if `countryIds` not provided) |
| `agentType` | `HOLIDAY` \| `VISA` \| `BOTH` | optional | Type of leads the agent handles |
| `expertiseDestinations` | string[] | optional | Destination names the agent specialises in |
| `targetAmount` | number | optional | Monthly revenue target |
| `incentivePercent` | number | optional | Commission percentage |
| `isActive` | boolean | optional | Defaults to `true` |
| `isOnLeave` | boolean | optional | Defaults to `false` |

---

### What Happens Internally

```
POST /api/users
       │
       ▼
  Validate (Zod)
       │
       ▼
  Hash password with bcrypt (cost 12)
       │
       ▼
  Resolve roleId → look up role name
       │
       ▼
  Determine roleKind:
    SUPERADMIN | MANAGER | AGENT | OTHER
       │
       ▼
  Validate hierarchy rules (see below)
       │
       ▼
  Check actor permissions:
    - AGENT actor → 403 forbidden
    - MANAGER actor → can only create AGENT under own id
       │
       ▼
  Resolve country:
    countryIds provided? → validate all IDs exist in countries table
    otherwise → use agentCountry / country (legacy)
    MANAGER or AGENT with no country → 400 error
       │
       ▼
  SUPERADMIN role? → enforce only 1 active superadmin
       │
       ▼
  Insert user row
       │
       ▼
  countryIds provided? → insert into user_countries table
  (replaces any existing country assignments)
       │
       ▼
  Emit users.created event
       │
       ▼
  Return full user object with permissions and countries
```

---

### Hierarchy Rules

| Role Kind | parentId Rule |
|---|---|
| `SUPERADMIN` | Must NOT have a parentId |
| `MANAGER` | Must NOT have a parentId (reports directly to superadmin) |
| `AGENT` | MUST have a parentId pointing to a user with a manager role |

Role kind is derived from the role name:
- Contains `"manager"` → MANAGER
- Contains `"agent"`, `"consultant"`, or `"executive"` → AGENT
- Is `"super_admin"` or `"superadmin"` → SUPERADMIN
- Everything else → OTHER

---

### Country Assignment

Two modes are supported:

**Mode 1 — Multi-country (recommended):**
```json
{
  "countryIds": ["uuid-india", "uuid-uae"],
  "primaryCountryId": "uuid-india"
}
```
Stored in `user_countries` table. The primary country is used for lead matching.

**Mode 2 — Legacy single country:**
```json
{
  "agentCountry": "India"
}
```
Stored directly in `users.agent_country`. Used as fallback when `user_countries` table has no entries.

---

### Actor Scope Restrictions

| Actor Role | Can Create |
|---|---|
| `super_admin` | Any role |
| `manager` | Only `agent` roles under own `id` as `parentId` |
| `agent` | ❌ Forbidden |

---

### Response

```json
{
  "data": {
    "id": "uuid",
    "fullName": "Priya Verma",
    "email": "priya@getfares.com",
    "role": "sales_consultant",
    "roleId": "uuid",
    "parentId": "uuid-of-manager",
    "managerId": "uuid-of-manager",
    "country": "India",
    "agentCountry": "India",
    "agentType": "HOLIDAY",
    "countries": [
      { "countryId": "uuid", "name": "India", "isPrimary": true }
    ],
    "isActive": true,
    "isOnLeave": false,
    "expertiseDestinations": ["Maldives", "Dubai"],
    "targetAmount": 500000,
    "incentivePercent": 5,
    "permissions": ["leads:read", "leads:create", "leads:update"],
    "createdAt": "2026-03-30T14:00:00.000Z"
  }
}
```

---

---

## 4. Error Reference

### Lead Errors

| Code | HTTP | Meaning |
|---|---|---|
| `LEAD_DUPLICATE` | 409 | Lead with same email/phone already exists |
| `LEAD_NOT_FOUND` | 404 | Lead ID does not exist |
| `LEAD_ACCESS_FORBIDDEN` | 403 | User does not have access to this lead |
| `LEAD_QUALIFICATION_REQUIRED` | 400 | Required qualification fields missing before status change |
| `LEAD_FOLLOWUP_COMPLIANCE_REQUIRED` | 409 | Not enough follow-ups before marking LOST/NON_RESPONSIVE |
| `LEAD_FOLLOWUP_LIMIT_REACHED` | 409 | Maximum follow-up attempts reached |
| `LEAD_CALLS_DISABLED` | 409 | Calls are disabled for this lead |
| `ASSIGNEE_NOT_FOUND` | 404 | Specified assignedTo user does not exist |
| `ASSIGNEE_COUNTRY_MISMATCH` | 400 | Agent's country does not match lead's country |
| `ASSIGNEE_OUTSIDE_MANAGER_TEAM` | 403 | Manager tried to assign to agent outside own team |

### User Errors

| Code | HTTP | Meaning |
|---|---|---|
| `USER_PASSWORD_REQUIRED` | 400 | No password provided |
| `USER_ROLE_REQUIRED` | 400 | No roleId provided |
| `USER_ROLE_NOT_FOUND` | 404 | roleId does not match any role |
| `USER_NOT_FOUND` | 404 | User ID does not exist |
| `USER_EMAIL_EXISTS` | 409 | Email already registered |
| `USER_COUNTRY_REQUIRED` | 400 | Manager/agent created without a country |
| `USER_INVALID_COUNTRY_IDS` | 400 | One or more countryIds not found |
| `USER_SINGLE_SUPERADMIN_ENFORCED` | 409 | Only one active super admin allowed |
| `USER_SUPERADMIN_PARENT_FORBIDDEN` | 400 | Super admin cannot have a parentId |
| `USER_MANAGER_PARENT_FORBIDDEN` | 400 | Manager cannot have a parentId |
| `USER_AGENT_PARENT_REQUIRED` | 400 | Agent must have a parentId (managerId) |
| `USER_PARENT_SELF_REFERENCE` | 400 | User cannot be their own parent |
| `USER_PARENT_MANAGER_REQUIRED` | 400 | parentId must point to a manager role user |
| `USER_AGENT_CREATE_FORBIDDEN` | 403 | Agents cannot create users |
| `USER_MANAGER_CREATE_SCOPE_FORBIDDEN` | 403 | Manager can only create agent users |
| `USER_MANAGER_PARENT_SCOPE_FORBIDDEN` | 403 | Manager must set themselves as parentId |

---

## Key Relationships

```
users
  └── role_id → roles.id
  └── parent_id / manager_id → users.id (manager)
  └── user_countries → countries.id (multi-country)

leads
  └── assigned_to → users.id
  └── customer_id → customers.id
  └── destination_id → destinations.id
  └── campaign_id → campaigns.id

queued_leads
  └── lead_id → leads.id

lead_assignment_history
  └── lead_id → leads.id
  └── previous_assignee_id → users.id
  └── new_assignee_id → users.id
  └── assigned_by → users.id

lead_activities
  └── lead_id → leads.id
  └── user_id → users.id
```
