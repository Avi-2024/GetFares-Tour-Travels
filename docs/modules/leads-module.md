# Leads module — developer guide

**Location:** `backend/crm/modules/leads`  
**Base URL:** `/api/leads`

Central CRM module for **sales leads**: capture, **RBAC-scoped listing**, **assignment** (manual/auto/round-robin), **follow-ups** (calls, WhatsApp, cadence), **SLA** handling, **temperature** (HOT/WARM/COLD), **duplicates**, **activities**, **automation** jobs (overdue follow-ups, SLA breaches, non-responsive, cadence).  
**Auth:** almost all routes use **`requireAuth`** + **`authorize(...)`**. **`POST /public-capture`** uses **`optionalAuth`** (website/forms can create leads without a user; defaults `source` / `status` in controller).

**Main tables (see `leads.schema.js`):** `leads`, `customers`, `lead_activities`, `followups`, `lead_followup_alert_logs`, `queued_leads`, plus lookups on **`users`**, **`countries`**, **`user_countries`**, **`roles`**, **`lead_assignment_history`**, **`destinations`**, **`app_settings`**.

---

## 1. High-level module overview

| Layer | Role |
|--------|------|
| **Routes** | Zod `validateRequest`, permissions, `asyncHandler`. |
| **Controller** | Maps `req.validated` + `req.context` to **service**; **200** / **201**. |
| **Service** | Large domain layer (~2.7k lines): mapping, **agent/manager visibility**, assignment algorithms, qualification & follow-up **compliance**, temperature, automation batches, events. Uses **in-memory** agent cache + **round-robin** state. |
| **Repository** | SQL/DB helpers: **paginated** `findAll`, lead code sequence, agents by country, follow-up stats, queues, SLA candidates, etc. |

---

## 2. Step-by-step flow (typical)

1. **`requireAuth`** (or **`optionalAuth`** on public capture) → **`authorize`**.  
2. **`validateRequest`** → **`req.validated`**.  
3. **Controller** → **service** method.  
4. **Service** enforces **access** (`canUserAccessLead` on get/update/assign), builds records, calls **repository**.  
5. **Repository** reads/writes DB (often Postgres-specific queries when `db.query` + pool exist).  
6. **Events** (`leads.events.js`) + **`lead_activities`** rows for audit trail.

---

## 3. HTTP map (routes)

| Method | Path | Permission (typical) |
|--------|------|----------------------|
| GET | `/` | `leads:read` |
| POST | `/` | `leads:create` |
| POST | `/public-capture` | *(no `authorize`; optional JWT)* |
| POST | `/distribute` | `leads:update` |
| POST | `/reassign-inactive` | `leads:update` |
| GET | `/followups/overdue` | `leads:read` |
| POST | `/followups/process-overdue` | `leads:update` |
| POST | `/sla/process-breaches` | `leads:update` |
| POST | `/followups/process-non-responsive` | `leads:update` |
| POST | `/followups/process-cadence-automation` | `leads:update` |
| GET | `/:id` | `leads:read` |
| PATCH | `/:id` | `leads:update` |
| POST | `/:id/assign` | `leads:update` |
| POST | `/:id/disable-calls` | `leads:update` |
| POST | `/:id/followups` | `leads:update` |
| GET | `/:id/followups` | `leads:read` |

Static paths (`/distribute`, `/public-capture`, …) are registered **before** `/:id` so they are not swallowed as ids.

---

## 4. Function-wise explanation (condensed)

### Controller (`leads.controller.js`)

| Handler | Purpose |
|---------|---------|
| `list` | Paginated leads + filters; passes **context** for agent/manager scoping. |
| `getById` | Single lead (access-checked in service). |
| `create` | Create lead. |
| `publicCapture` | Same as create but forces **`source`** default `"website"` and **`status`** default `"OPEN"` if omitted. |
| `update` | Patch lead (heavy workflow in service). |
| `assign` | `assignLead`. |
| `distribute` | Bulk-assign **unassigned** `OPEN` leads. |
| `reassignInactive` | Reassign leads whose assignee inactive too long. |
| `createFollowup` / `listFollowups` | Schedule or list follow-ups. |
| `disableCalls` | Toggle **calls disabled** (e.g. WhatsApp-only). |
| `listOverdueFollowups` | Query overdue follow-up rows. |
| `processOverdueFollowups` | Batch: log + **`emitFollowupOverdue`**. |
| `processSlaBreaches` | SLA breach handling + possible reassignment. |
| `processNonResponsive` | Auto **NON_RESPONSIVE** when rules match. |
| `processCadenceAutomation` | Auto-schedule cadence follow-ups / close stale leads. |

### Service (exported API — `leads.service.js`)

**Also exported for other modules:** `buildCreateRecord`, `buildUpdateRecord`, `determineLeadTemperature`, `createOrGetDuplicate`, `distributePending`, `processQueuedLeads`, `getSystemDateTimePreferences`, `processUpcomingFollowupReminders` (not all wired in `leads.routes.js`).

| Area | Behavior (short) |
|------|------------------|
| **`list`** | Normalizes filters (quick filter, SLA, sort, dates). **Agents** see only their **assigned** leads + **country** scope from `user_countries`. **Managers** see self + **managed agents** + unassigned. Super-admin / full access bypass handled inside **`canUserAccessLead`**. Returns `{ data, pagination }`. |
| **`getById` / `update` / `assignLead`** | Access checks; **update** runs qualification assertions, follow-up compliance on LOST/NON_RESPONSIVE, may sync **customer** row, append **workflow follow-up** history, activities, SLA events. |
| **`create`** | Duplicate detection (email/phone), **lead code** assignment via repo, destination resolution, optional **auto-assign**, **temperature**, **queue** if no agent, **`emitCreated`**. |
| **`assignLead`** | Manual/auto modes, **round-robin** + cached eligible agents by country/role, assignment history, **`emitAssigned` / `emitReassigned`**. |
| **`distributePending`** | Loops **unassigned** leads, **`assignLead`** with `AUTO_DISTRIBUTION`, **`emitDistributionRun`**. |
| **`reassignInactive`** | Finds stale assignments, reassigns with **`excludeUserId`**. |
| **`createFollowup`** | Validates **CALL** vs **callsDisabled**; inserts **schedule-only** follow-up; may set **`next_followup_date`** on lead; activity **`FOLLOWUP_SCHEDULED`**. |
| **`disableCalls`** | Updates `calls_disabled`, activity. |
| **`listFollowups`** | After **getById**, lists follow-ups for lead. |
| **`processOverdueFollowups`** | Dedupes via **`lead_followup_alert_logs`**; **`emitFollowupOverdue`**. |
| **`processSlaBreaches`** | Marks breach, activity, **`assignLead`** escalation, **`emitSlaBreached`**, **`emitEscalated`**. |
| **`processNonResponsive`** | Marks **NON_RESPONSIVE** when compliance complete + stale; **`emitEscalated`**. |
| **`processCadenceAutomation`** | Schedules missing **cadence** slots (`CADENCE_TEMPLATE`), may auto-close as non-responsive. |

### Repository (`leads.repository.js`)

Implements persistence: **lead CRUD**, **lead_code** generation (`nextval` or scan), **findAll** with rich filtering (search, SLA, temperatures, joins), **agents** / **managed agents**, **queued_leads**, **followups** (type mapping to ints), **compliance stats**, **activities**, **customers** update when linked, **system date/time** prefs from **`app_settings`**, introspection for optional columns, etc.

### Events (`leads.events.js`)

Emits: **`leads.created`**, **`leads.updated`**, **`leads.assigned`**, **`leads.reassigned`**, **`leads.distribution_run`**, **`leads.followup_overdue`**, **`leads.followup_due_soon`**, **`leads.sla_breached`**, **`leads.escalated`**. **`emitFollowupCreated`** exists on the events helper—confirm call sites if you rely on **`leads.followup_created`**. Each logs **info** or **warn** then **`eventBus.emit`**.

### Validation (`leads.validation.js`)

Broad **Zod** schemas: lead fields (travel, UTM, type, status, assignment…), **create** requires **fullName**, **phone**, **email**; **update** requires ≥1 field; **LOST** requires **closedReason**; assign/distribute/automation bodies as listed in schema.

---

## 5. Input → processing → output (patterns)

| Operation | Input | Processing | Output |
|-----------|--------|--------------|--------|
| **List** | Query filters + **JWT** | Role-based filter injection + repo pagination | `{ data: leads[], pagination }` |
| **Create** | Rich body + context | Dedup, map, assign, events | Lead **201** |
| **Update** | Patch + context | Qualification, compliance, workflow follow-up row, customer sync | Lead **200** |
| **Assign** | Optional `assignedTo`, `mode`, `force`, … | Round-robin or manual | Updated lead |
| **Automation POSTs** | `limit`, sometimes `staleDays` | Batch processing + logs + events | Summary objects (counts, ids, errors) |

---

## 6. Business logic (simple terms)

- **Leads** move through **statuses** (OPEN → CONTACTED → WIP → QUOTED → FOLLOW_UP → CONVERTED / LOST / NON_RESPONSIVE, etc.). Sub-statuses track **follow-up attempt** depth.  
- **Temperature** (HOT/WARM/COLD) is **derived** from budget, travel proximity, and signals—not a simple DB enum only.  
- **Assignment** prefers agents **allowed for the lead’s country** and **role** (agent vs manager); uses **round-robin** state and caching to spread load. Unassigned **OPEN** leads can sit in a **queue** or bulk **distribute**.  
- **Follow-up policy** defines how many **calls / WhatsApp / final reminders** count toward **compliance** before closing as **LOST** or **NON_RESPONSIVE**.  
- **SLA:** First contact within a **15-minute** window is enforced in automation; breaches trigger **reassignment** and **manager**-targeted events.  
- **Public capture** lowers friction for web forms; same **create** pipeline as authenticated create.

---

## 7. Database operations

| Operation | Typical targets |
|-----------|-----------------|
| **SELECT** | `leads` (heavy list queries), `users`, `followups`, `lead_activities`, queues, settings, etc. |
| **INSERT** | `leads`, `lead_activities`, `followups`, `lead_followup_alert_logs`, `queued_leads`, sometimes **customers** |
| **UPDATE** | `leads`, `followups`, `customers` (when linked), queue rows, SLA flags |

Exact SQL is in **`leads.repository.js`** (Postgres-oriented).

---

## 8. Validations and conditions

- **Zod** on all HTTP inputs; status strings uppercased.  
- **Service** throws **`AppError`** for duplicates, forbidden access, missing qualification, follow-up compliance failures, disabled calls, invalid dates, etc.  
- **Agents** cannot arbitrarily read/update leads outside visibility rules (enforced in service + repo filters).

---

## 9. Side effects

| Kind | Details |
|------|---------|
| **Event bus** | Many **`leads.*`** events for notifications, WhatsApp, analytics (implementations live elsewhere). |
| **Activities** | **`lead_activities`** rows on updates, SLA, non-responsive, follow-ups, call toggle. |
| **Email/SMS** | **Not** sent inside this module; consumers subscribe to events. |
| **In-memory** | **AgentCache** (TTL ~5 min), **RoundRobinState** (process lifetime). |
| **Logs** | `logger` throughout service/repository. |

---

## 10. Example API request/response

**Create (authenticated)** — `POST /api/leads`

```json
{
  "fullName": "Jane Doe",
  "phone": "+919876543210",
  "email": "jane@example.com",
  "leadCountry": "India",
  "destinationName": "Dubai",
  "budget": 200000,
  "travelDate": "2026-08-01",
  "source": "website",
  "autoAssign": true
}
```

**Response** — `201` `{ "data": { "id": "...", "leadCode": "...", "status": "OPEN", "temperature": "HOT", ... } }`

**List** — `GET /api/leads?page=1&limit=15&quickFilter=ACTIVE&sortBy=NEWEST_FIRST`

**Public capture** — `POST /api/leads/public-capture` with same body shape (email/phone/fullName required by Zod); optional anonymous.

**Assign** — `POST /api/leads/:id/assign`  
`{ "assignedTo": "<uuid>", "mode": "MANUAL" }`

**Patch lead** — `PATCH /api/leads/:id`  
`{ "status": "CONTACTED", "notes": "Called customer" }`

---

## 11. Notes for developers

- **Service file is large** — search by method name or read **`return Object.freeze({`** near file end for the exported surface.  
- **`processQueuedLeads`** exists on the service but is **not** exposed in `leads.routes.js`; may be invoked from **cron** or **another module**.  
- **Repository** behavior depends on **Postgres** features and **schema** (sequences, columns). Optional columns are probed for safe deploys.  
- **Duplicate** handling: **`createOrGetDuplicate`** catches **`LEAD_DUPLICATE`** and returns existing lead (used by integrations).  
- For **frontend**, list response includes **`pagination`** (`total`, `totalPages`), not only a flat array.

---

*This document summarizes behavior without reproducing every branch in `leads.service.js` / `leads.repository.js`. Read those files when debugging edge cases.*
